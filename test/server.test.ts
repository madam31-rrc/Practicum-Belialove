import { greet, add } from "../src/server";

describe("Server Functions", () => {
    test("should return greeting message", () => {
        const result = greet("World"); // Place breakpoint here for debugging
        expect(result).toBe("Hello, World");
    });

    test("should add two numbers", () => {
        const result = add(5, 3); // Place breakpoint here for debugging
        expect(result).toBe(8);
    });
});
