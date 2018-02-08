import gql from "graphql-tag";

import merge from "../fusion";

describe("merge", () => {
  it("works with parameter conflicts", () => {
    const queryA = gql`
      query A {
        products(first: 10) {
          id
          name
        }
      }
    `;

    const queryB = gql`
      query B {
        products(first: 1, after: 10) {
          id
          isActive
        }
      }
    `;

    const expectedQuery = gql`
      query A_B {
        products(first: 10) {
          id
          name
        }
        _products: products(first: 1, after: 10) {
          id
          isActive
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
        variables: {},
        operationName: "B"
      }
    ]);

    expect(mergedQuery.query).toEqual(expectedQuery);
    expect(mergedQuery.operationName).toEqual("A_B");
    expect(mergedQuery.variables).toEqual({});

    const response = {
      data: {
        products: {
          id: "pID",
          name: "pName"
        },
        _products: {
          id: "qID",
          isActive: true
        }
      }
    };

    const parsedResponses = mergedQuery.parse(response);

    const expectedResponses = [
      {
        data: {
          products: {
            id: "pID",
            name: "pName"
          }
        }
      },
      {
        data: {
          products: {
            id: "qID",
            isActive: true
          }
        }
      }
    ];

    expect(parsedResponses).toEqual(expectedResponses);
  });
});
