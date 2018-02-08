import gql from "graphql-tag";

import merge from "../fusion";

describe("parse", () => {
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

    const mergedQuery = merge([
      {
        query: queryA,
        variables: {},
        operationName: "A"
      }
    ]);

    const response = {
      data: {
        a: {
          id: "aID"
        },
        b: {
          id: "bID"
        }
      }
    };

    const parsedResponses = mergedQuery.parse(response);

    const expectedResponses = [
      {
        data: {
          a: {
            id: "aID"
          },
          b: {
            id: "bID"
          }
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
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

    const mergedQuery = merge([
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

    const response = {
      data: {
        a: {
          id: "aID",
          name: "aName"
        },
        b: {
          id: "bID"
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
          b: {
            id: "bID"
          }
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
  });

  it("supports fragments", () => {
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

    const mergedQuery = merge([
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

    const response = {
      data: {
        author: {
          address: "123 Lane st.",
          phone: "1 (800) GRAPHQL",
          name: {
            first: "John",
            last: "Doe",
            full: "John Doe"
          }
        }
      }
    };

    const parsedResponses = mergedQuery.parse(response);

    const expectedResponses = [
      {
        data: {
          author: {
            name: {
              first: "John",
              last: "Doe"
            }
          }
        }
      },
      {
        data: {
          author: {
            address: "123 Lane st.",
            phone: "1 (800) GRAPHQL",
            name: {
              full: "John Doe"
            }
          }
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
  });

  it("works with array responses", () => {
    const queryA = gql`
      query A {
        users {
          id
        }
      }
    `;

    const queryB = gql`
      query B {
        users {
          name
        }
      }
    `;

    const mergedQuery = merge([
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

    const response = {
      data: {
        users: [
          {
            id: "aID",
            name: "aName"
          },
          {
            id: "bID",
            name: "bName"
          }
        ]
      }
    };

    const parsedResponses = mergedQuery.parse(response);

    const expectedResponses = [
      {
        data: {
          users: [
            {
              id: "aID"
            },
            {
              id: "bID"
            }
          ]
        }
      },
      {
        data: {
          users: [
            {
              name: "aName"
            },
            {
              name: "bName"
            }
          ]
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
  });

  it("works with null responses", () => {
    const queryA = gql`
      query A {
        users {
          id
        }
      }
    `;

    const mergedQuery = merge([
      {
        query: queryA,
        variables: {},
        operationName: "A"
      }
    ]);

    const response = {
      data: {
        users: null
      }
    };

    const parsedResponses = mergedQuery.parse(response);

    const expectedResponses = [
      {
        data: {
          users: null
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
  });
});
