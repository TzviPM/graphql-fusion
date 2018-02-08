import gql from "graphql-tag";

import merge from "../fusion";

describe("merge", () => {
  it("works with a single query", () => {
    const queryA = gql`
      query A {
        a {
          id
        }
        b {
          id
        }
      }
    `;

    const expectedQuery = gql`
      query A {
        a {
          id
        }
        b {
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
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("A");
    expect(result.variables).toEqual({});
  });

  it("works with basic queries", () => {
    const queryA = gql`
      query A {
        a {
          id
        }
      }
    `;

    const queryB = gql`
      query B {
        a {
          name
        }
        b {
          id
        }
      }
    `;

    const expectedQuery = gql`
      query A_B {
        a {
          id
          name
        }
        b {
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
        variables: {},
        operationName: "B"
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("A_B");
    expect(result.variables).toEqual({});
  });

  it("works with three queries", () => {
    const queryA = gql`
      query A {
        a {
          id
        }
      }
    `;

    const queryB = gql`
      query B {
        a {
          name
        }
        b {
          id
        }
      }
    `;

    const queryC = gql`
      query B {
        b {
          id
          foo
        }
      }
    `;

    const expectedQuery = gql`
      query A_B_C {
        a {
          id
          name
        }
        b {
          id
          foo
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
        variables: {},
        operationName: "B"
      },
      {
        query: queryC,
        variables: {},
        operationName: "C"
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("A_B_C");
    expect(result.variables).toEqual({});
  });
});
