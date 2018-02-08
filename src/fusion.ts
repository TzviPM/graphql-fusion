import { DocumentNode } from "graphql/language";

export interface QueryOperation {
  query: DocumentNode;
  variables: Record<string, any>;
  operationName: string;
}

export class MergedQuery {
  public query: DocumentNode;
  public variables: Record<string, any> = {};
  public operationName: string;

  private variableMap: Record<string, any>[];
  private fragments: Record<string, any> = {};
  private names = new Set<string>();
  private nameLookup: Record<string, string> = {};

  constructor(private queries: QueryOperation[]) {
    this.operationName = queries.map(query => query.operationName).join("_");
    this.mergeVariables();
    this.detectFragments();
    this.expandQueries(); // also populates this.names
    this.mergeQueries();
  }

  public parse(response) {
    const data = response.data;

    return this.queries.map(query => {
      const expandedSelectionSet = getQuerySelectionSet(query);

      return {
        data: this.filterData(data, expandedSelectionSet)
      };
    });
  }

  private filterData(data, selectionSet) {
    if (data == null) {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map(elem => this.filterData(elem, selectionSet));
    }
    const filtered = {};
    for (const selection of selectionSet.selections) {
      const key =
        this.nameLookup[selection.name.value] ||
        (selection.alias ? selection.alias.value : selection.name.value);
      const responseKey = selection.name.value;
      const value = data[responseKey];

      if (selection.selectionSet == null) {
        filtered[key] = value;
      } else {
        filtered[key] = this.filterData(value, selection.selectionSet);
      }
    }

    return filtered;
  }

  private mergeVariables() {
    this.variableMap = this.queries.map(query => {
      const newVariableNames = {};

      for (const variableName of Object.keys(query.variables)) {
        const newName = this.uniqueVariableName(variableName);
        this.variables[newName] = query.variables[variableName];
        newVariableNames[variableName] = newName;
      }

      return newVariableNames;
    });
  }

  private uniqueVariableName(variableName: string) {
    if (this.variables[variableName] != null) {
      // another query owns this already
      return this.uniqueVariableName(`_${variableName}`);
    }
    return variableName;
  }

  private detectFragments() {
    for (let operation of this.queries) {
      const fragmentDefinitions = operation.query.definitions.filter(
        ({ kind }) => kind === "FragmentDefinition"
      );
      for (const fragmentDefinition of fragmentDefinitions) {
        this.fragments[fragmentDefinition.name.value] =
          fragmentDefinition.selectionSet.selections;
      }
    }
  }

  private lookupFragment(fragmentName: string) {
    return this.fragments[fragmentName];
  }

  /** MUTATES Queries */
  private expandQueries() {
    this.queries.forEach((operation, index) => {
      const { selections } = getQuerySelectionSet(operation);
      const newVariableNames = this.variableMap[index];

      const expandedSelections = selections.reduce((acc, cur) => {
        return acc.concat(this.expandSelection(cur, newVariableNames));
      }, []);

      setQuerySelections(operation, expandedSelections);
    });
  }

  private mergeQueries() {
    const renamedVariableDefinitions = this.queries.map((operation, index) => {
      const { query: { definitions } } = operation;
      const variableDefinitions = definitions.find(
        ({ kind }) => kind === "OperationDefinition"
      ).variableDefinitions;

      const newVariableNames = this.variableMap[index];

      return (
        variableDefinitions &&
        variableDefinitions.map(definition => {
          const newName = newVariableNames[definition.variable.name.value];
          return {
            ...definition,
            variable: {
              ...definition.variable,
              name: {
                kind: "Name",
                value: newName
              }
            }
          };
        })
      );
    });

    const mergedVariableDefinitions = renamedVariableDefinitions.reduce(
      (acc, cur) => {
        return acc.concat(cur);
      },
      []
    );

    const querySelections = this.queries.map(getQuerySelectionSet);
    const mergedSelectionSet = this.mergeSelectionSets(querySelections);

    const mergedQueryOperation = {
      directives: [],
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: this.operationName },
      selectionSet: mergedSelectionSet,
      variableDefinitions: mergedVariableDefinitions
    };

    const mergedQuery = {
      kind: "Document",
      definitions: [mergedQueryOperation]
    };

    this.query = mergedQuery;
  }

  /** MUTATES Input */
  private mergeSelectionSets(selectionSets) {
    const mergedSelections: any[] = [];

    for (let selectionSet of selectionSets) {
      if (selectionSet == null) {
        continue;
      }

      const { selections } = selectionSet;

      for (let selection of selections) {
        const existingSelection = mergedSelections.findIndex(elem => {
          return elem.name.value === selection.name.value;
        });

        if (existingSelection === -1) {
          const newSelection = {
            ...selection,
            alias: undefined,
            selectionSet: this.mergeSelectionSets([selection.selectionSet])
          };
          mergedSelections.push(newSelection);
        } else {
          const oldSelection = mergedSelections[existingSelection];

          const mergeable = this.argumentsMatch(
            oldSelection.arguments,
            selection.arguments
          );

          if (mergeable) {
            const newSelection = {
              ...oldSelection,
              selectionSet: this.mergeSelectionSets([
                oldSelection.selectionSet,
                selection.selectionSet
              ])
            };
            mergedSelections[existingSelection] = newSelection;
          } else {
            const uniqueName = this.getUniqueName(
              selection.name.value,
              selection.alias
            );
            const newSelection = {
              ...selection,
              name: {
                kind: "Name",
                value: selection.name.value
              },
              alias: {
                kind: "Name",
                value: uniqueName
              },
              selectionSet: this.mergeSelectionSets([selection.selectionSet])
            };
            selection.name.value = uniqueName; // mutate for parsing response
            mergedSelections.push(newSelection);
          }
        }
      }
    }

    return mergedSelections.length > 0
      ? {
          kind: "SelectionSet",
          selections: mergedSelections
        }
      : undefined;
  }

  argumentsMatch(argsA?: any[], argsB?: any[]) {
    if (argsA == null) {
      return argsB == null;
    }
    if (argsB == null) {
      return false;
    }
    if (argsA.length !== argsB.length) {
      return false;
    }
    for (let arg of argsA) {
      const name = arg.name.value;
      const val = arg.value.value;
      const matchingArg = argsB.find(arg => arg.name.value === name);
      if (matchingArg == null) {
        return false;
      }
      if (matchingArg.value.value !== val) {
        // TODO deep equality for complex params
        return false;
      }
    }
    return true;
  }

  private getUniqueName(oldName, responseAlias) {
    let iterator = oldName;
    while (this.names.has(iterator)) {
      iterator = `_${iterator}`;
    }
    this.nameLookup[iterator] = responseAlias ? responseAlias.value : oldName;
    return iterator;
  }

  private expandSelection(selection, newVariableNames) {
    switch (selection.kind) {
      case "FragmentSpread":
        return this.lookupFragment(selection.name.value).reduce((acc, cur) => {
          return acc.concat(this.expandSelection(cur, newVariableNames));
        }, []);
      case "Field":
        this.names.add(selection.name.value);
        return [
          {
            ...selection,
            arguments:
              selection.arguments &&
              selection.arguments.map(arg => {
                return {
                  ...arg,
                  value:
                    arg.value.kind === "Variable"
                      ? {
                          ...arg.value,
                          name: {
                            kind: "Name",
                            value: newVariableNames[arg.value.name.value]
                          }
                        }
                      : arg.value
                };
              }),
            selectionSet:
              selection.selectionSet == null
                ? selection.selectionSet
                : {
                    ...selection.selectionSet,
                    selections: selection.selectionSet.selections.reduce(
                      (acc, cur) => {
                        return acc.concat(
                          this.expandSelection(cur, newVariableNames)
                        );
                      },
                      []
                    )
                  }
          }
        ];
      default:
        return [selection];
    }
  }
}

function getQuerySelectionSet(operation: QueryOperation) {
  const { query: { definitions } } = operation;
  const operationDefinition = definitions.find(
    ({ kind }) => kind === "OperationDefinition"
  );
  return operationDefinition.selectionSet;
}

function setQuerySelections(operation: QueryOperation, selections: any[]) {
  const { query: { definitions } } = operation;
  const operationDefinition = definitions.find(
    ({ kind }) => kind === "OperationDefinition"
  );
  operationDefinition.selectionSet.selections = selections;
}

function merge(queries: QueryOperation[]): MergedQuery {
  return new MergedQuery(queries);
}

export default merge;
