import gql from "graphql-tag";

import merge from "../fusion";

describe("merge", () => {
  it("works with aliases", () => {
    const queryA = gql`
      query A {
        a {
          id
        }
      }
    `;

    const queryB = gql`
      query B($foo: String) {
        a {
          name
        }
        another: a {
          id
          foo
        }
      }
    `;

    const expectedQuery = gql`
      query A_B($foo: String) {
        a {
          id
          name
          foo
        }
      }
    `;

    // remove location metadata
    delete expectedQuery.loc;

    const mergedQuery = merge([
      {
        query: queryA,
        variables: {},
        operationName: "A"
      },
      {
        query: queryB,
        variables: { foo: "bar" },
        operationName: "B"
      }
    ]);

    expect(mergedQuery.query).toEqual(expectedQuery);
    expect(mergedQuery.operationName).toEqual("A_B");
    expect(mergedQuery.variables).toEqual({ foo: "bar" });

    const response = {
      data: {
        a: {
          id: "aID",
          name: "aName",
          foo: "aFoo"
        }
      }
    };

    const parsedResponses = mergedQuery.parse(response);

    const expectedResponses = [
      {
        data: {
          a: {
            id: "aID"
          }
        }
      },
      {
        data: {
          a: {
            name: "aName"
          },
          another: {
            id: 'aID',
            foo: 'aFoo'
          }
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
  });
});
