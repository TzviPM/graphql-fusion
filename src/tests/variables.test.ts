import gql from "graphql-tag";

import merge from "../fusion";

describe.only("merge", () => {
  it("works with variables", () => {
    const queryA = gql`
      query A {
        a {
          id
        }
      }
    `;

    const queryB = gql`
      query B($fooFirst: String) {
        a {
          name
        }
        b(first: $fooFirst) {
          id
        }
      }
    `;

    const expectedQuery = gql`
      query A_B($fooFirst: String) {
        a {
          id
          name
        }
        b(first: $fooFirst) {
          id
        }
      }
    `;

    // remove location metadata
    delete expectedQuery.loc;

    const result = merge([
      {
        query: queryA,
        variables: {},
        operationName: "A"
      },
      {
        query: queryB,
        variables: {fooFirst: 'bar'},
        operationName: "B"
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("A_B");
    expect(result.variables).toEqual({fooFirst: 'bar'});
  });

  it("works with multiple queries having variables", () => {
    const queryA = gql`
      query A($foo: String) {
        a(foo: $foo) {
          id
        }
      }
    `;

    const queryB = gql`
      query B($foo: String) {
        b(foo: $foo) {
          id
        }
      }
    `;

    const expectedQuery = gql`
      query A_B($foo: String, $_foo: String) {
        a(foo: $foo) {
          id
        }
        b(foo: $_foo) {
          id
        }
      }
    `;

    // remove location metadata
    delete expectedQuery.loc;

    const result = merge([
      {
        query: queryA,
        variables: {foo: 'barA'},
        operationName: "A"
      },
      {
        query: queryB,
        variables: {foo: 'barB'},
        operationName: "B"
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("A_B");
    expect(result.variables).toEqual({foo: 'barA', _foo: 'barB'});
  });
});
