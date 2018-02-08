import gql from "graphql-tag";

import merge from "../fusion";

describe("merge", () => {
  it("expands fragments", () => {
    const queryA = gql`
      query AuthorName {
        author {
          ...nameDetails
        }
      }

      fragment nameDetails on Author {
        firstName
        lastName
      }
    `;

    const queryB = gql`
      query AuthorLocation {
        author {
          ...locationDetails
        }
      }

      fragment locationDetails on Author {
        address
        phone
      }
    `;

    const expectedQuery = gql`
      query AuthorName_AuthorLocation {
        author {
          firstName
          lastName
          address
          phone
        }
      }
    `;

    // remove location metadata
    delete expectedQuery.loc;

    const result = merge([
      {
        query: queryA,
        variables: {},
        operationName: "AuthorName"
      },
      {
        query: queryB,
        variables: {},
        operationName: "AuthorLocation"
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("AuthorName_AuthorLocation");
    expect(result.variables).toEqual({});
  });

  it("merges fragments", () => {
    const queryA = gql`
      query AuthorName {
        author {
          ...names
        }
      }

      fragment names on Author {
        name {
          first
          last
        }
      }
    `;

    const queryB = gql`
      query AuthorLocation {
        author {
          ...location
        }
      }

      fragment location on Author {
        address
        phone
        name {
          full
        }
      }
    `;

    const expectedQuery = gql`
      query AuthorName_AuthorLocation {
        author {
          name {
            first
            last
            full
          }
          address
          phone
        }
      }
    `;

    // remove location metadata
    delete expectedQuery.loc;

    const result = merge([
      {
        query: queryA,
        variables: {},
        operationName: "AuthorName"
      },
      {
        query: queryB,
        variables: {},
        operationName: "AuthorLocation"
      }
    ]);

    expect(result.query).toEqual(expectedQuery);
    expect(result.operationName).toEqual("AuthorName_AuthorLocation");
    expect(result.variables).toEqual({});
  });

  it("supports nested fragments", () => {
    const queryA = gql`
      query A {
        a {
          ...aFragment
          ...aFragment2
        }
      }

      fragment aFragment on A {
        b {
          ...bFragment
          c {
            e
          }
        }
      }

      fragment bFragment on B {
        c {
          d
        }
      }

      fragment aFragment2 on A {
        b {
          ...bFragment
        }
      }
    `;

    const expectedQuery = gql`
      query A {
        a {
          b {
            c {
              d
              e
            }
          }
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
});
