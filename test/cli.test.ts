import path from "path";
import tmp from "tmp";
import fs from "fs";
import mockConsole from "jest-mock-console";
import * as mockProcess from "jest-mock-process";
import * as prettier from "prettier";

// jest.mock("prettier", () => ({
//   __esModule: true,
//   resolveConfig: {
//     sync: jest.fn(),
//   },
// }));

import { cli } from "../src/cli";

// cleanup temp dir automatically in case of an exception
tmp.setGracefulCleanup();

describe("cli", () => {
  let tmpdir;
  let tmpobj;

  beforeEach(() => {
    // @ts-ignore
    tmpobj = tmp.dirSync();
    tmpdir = tmpobj.name;
  });

  afterEach(() => {
    // cleanup temp dir
    tmpobj.removeCallback();
  });

  it("should exit with code one when no files have been provided", () => {
    // Arrange
    mockConsole();
    const mockExit = mockProcess.mockProcessExit();
    const mockStdout = mockProcess.mockProcessStdout();

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js")]);

    // Assert
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
    mockStdout.mockRestore();
  });

  it("should console.log output", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    expect(console.log).toHaveBeenCalledWith("const a: number = 5;");
  });

  it("should not write a file", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    const outputPath = path.join(tmpdir, "test.tsx");
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("should error any files with errors", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "?", "utf-8");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    expect(console.error).toHaveBeenCalledWith(`error processing ${inputPath}`);
  });

  it("should write a file", () => {
    // Arrange
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      inputPath,
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "test.tsx"))).toBe(true);
  });

  it("should write many files with a glob", () => {
    // Arrange
    const inputGlob = path.join(tmpdir, "*.js");
    fs.writeFileSync(
      path.join(tmpdir, "foo.js"),
      "const a: number = 5;",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tmpdir, "bar.js"),
      "const b: boolean = true;",
      "utf-8"
    );

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      inputGlob,
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "foo.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "bar.tsx"))).toBe(true);
  });

  it("should delete the original file", () => {
    // Arrange
    const inputPath = path.join(tmpdir, "test.js");
    const outputPath = path.join(tmpdir, "test.tsx");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      "--delete-source",
      inputPath,
    ]);

    // Assert
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(inputPath)).toBe(false);
  });

  it("should delete many original files", () => {
    // Arrange
    const inputGlob = path.join(tmpdir, "*.js");
    fs.writeFileSync(
      path.join(tmpdir, "foo.js"),
      "const a: number = 5;",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tmpdir, "bar.js"),
      "const b: boolean = true;",
      "utf-8"
    );

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      "--delete-source",
      inputGlob,
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "foo.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "bar.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "foo.js"))).toBe(false);
    expect(fs.existsSync(path.join(tmpdir, "bar.js"))).toBe(false);
  });

  it("should convert jsx to tsx and delete many original files", () => {
    // Arrange
    const inputGlob = path.join(tmpdir, "*.js?(x)");
    fs.writeFileSync(
      path.join(tmpdir, "foo.js"),
      "const a: number = 5;",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tmpdir, "bar.jsx"),
      "const b: React.Node = <h1>hello</h1>;",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tmpdir, "baz.jsx"),
      "const c: boolean = false;",
      "utf-8"
    );

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      "--delete-source",
      inputGlob,
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "foo.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "bar.tsx"))).toBe(true);
    expect(
      fs.existsSync(path.join(tmpdir, "baz.tsx")) // Uses .ts extension if no JSX syntax found
    ).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "foo.jsx"))).toBe(false);
    expect(fs.existsSync(path.join(tmpdir, "bar.jsx"))).toBe(false);
    expect(fs.existsSync(path.join(tmpdir, "baz.jsx"))).toBe(false);
  });

  it("should write to the file", () => {
    // Arrange
    const inputPath = path.join(tmpdir, "test.js");
    const outputPath = path.join(tmpdir, "test.tsx");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      inputPath,
    ]);

    // Assert
    const output = fs.readFileSync(outputPath, "utf-8");
    expect(output).toBe("const a: number = 5;");
  });

  it("should not attempt to load the prettier config file", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");
    const syncSpy = jest.spyOn(prettier.resolveConfig, "sync");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it("should attempt to load the prettier config file", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");
    const syncSpy = jest.spyOn(prettier.resolveConfig, "sync");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--prettier",
      inputPath,
    ]);

    // Assert
    expect(syncSpy).toHaveBeenCalled();
  });

  it("should exit with code one when parsing the prettier config fails", () => {
    // Arrange
    mockConsole();
    const mockExit = mockProcess.mockProcessExit();
    const mockStdout = mockProcess.mockProcessStdout();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");
    const syncSpy = jest.spyOn(prettier.resolveConfig, "sync");
    syncSpy.mockImplementationOnce(() => {
      throw new Error();
    });

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--prettier",
      inputPath,
    ]);

    // Assert
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
    mockStdout.mockRestore();
  });

  it("should use prettier options from file when a config file is found", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, 'const a: string = "string";', "utf-8");
    const prettierConfig = {
      singleQuote: true,
    };
    const syncSpy = jest.spyOn(prettier.resolveConfig, "sync");
    syncSpy.mockReturnValueOnce(prettierConfig);

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--prettier",
      inputPath,
    ]);

    // Assert
    expect(console.log).toHaveBeenCalledWith("const a: string = 'string';");
  });

  it("should use default prettier options when no config file is found", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, 'const a: string = "string";', "utf-8");
    const syncSpy = jest.spyOn(prettier.resolveConfig, "sync");
    syncSpy.mockReturnValueOnce(null);

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--prettier",
      inputPath,
    ]);

    // Assert
    expect(console.log).toHaveBeenCalledWith('const a: string = "string"');
  });

  // TODO: add tests for option handling
});
