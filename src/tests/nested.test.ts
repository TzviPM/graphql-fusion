import gql from "graphql-tag";

import merge from "../fusion";

describe("merge", () => {
  it("works with nested queries", () => {
    const queryA = gql`
      query A {
        a {
          b1 {
            c1
            c2 {
              d
            }
          }
          b2
        }
      }
    `;

    const queryB = gql`
      query B {
        a {
          b1 {
            c3
            c2 {
              d
              e
            }
          }
        }
      }
    `;

    const expectedQuery = gql`
      query A_B {
        a {
          b1 {
            c1
            c2 {
              d
              e
            }
            c3
          }
          b2
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
});
