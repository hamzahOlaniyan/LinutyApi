import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Linuty API",
      version: "1.0.0",
      description: "API documentation for Linuty social app"
    },
    servers: [
      { url: "http://localhost:8080/api" }
    ]
  },
  // paths where swagger-jsdoc will look for JSDoc comments
  apis: ["src/modules/**/*.routes.ts", "src/modules/**/*.controller.ts"]
};

export const swaggerSpec = swaggerJsdoc(options);
