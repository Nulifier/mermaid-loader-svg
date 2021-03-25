import fs from "fs/promises";
import os from "os";
import path from "path";
import childProcess  from "child_process";
import { getOptions, interpolateName, OptionObject } from "loader-utils";
import { validate } from "schema-utils";
import { Schema } from "schema-utils/declarations/validate";
import { EnvironmentPlugin, loader } from "webpack";

const schema: Schema = {};

export async function processDiagram(context: loader.LoaderContext, source: string) {
	// Get the options passed to this loaders
	const options = getOptions(context);

	// Validate that the options match the schema
	validate(schema, options, {
		name: "Mermaid Loader SVG",
		baseDataPath: "options"
	});

	// Make a temporary directory
	const tempDir = ".tmp-mermaid";
	try {
		await fs.mkdir(tempDir);
	}
	catch (err) {}

	const inputPath = path.join(tempDir, "input.mmd");
	const outputPath = path.join(tempDir, "output.svg");
	const configPath = path.join(tempDir, "config.json");

	// Output the input and config files
	await Promise.all([
		fs.writeFile(inputPath, source),
		fs.writeFile(configPath, JSON.stringify(options), "utf-8")
	]);

	let output = "";
	try {
		// Call mermaid compiler
		const childArgs = [
			`-i ../../${inputPath}`,
			`-o ../../${outputPath}`,
			`-c ../../${configPath}`
		];

		const env = {
			...process.env,
			path: `${process.env};${path.join("node_modules", ".bin")}`
		};

		await new Promise<void>((resolve, reject) => {
			childProcess.execFile("mmdc.cmd", childArgs, { env: env }, (err, stdout, stderr) => {
				console.log(stdout);
				console.log(stderr);
				if (err) reject(err);
				resolve();
			});
		});

		output = (await fs.readFile(outputPath)).toString();
	}
	finally {
		// Remove temporary directory
		await Promise.all([
			fs.unlink(inputPath),
			fs.unlink(outputPath).catch(() => {}),
			fs.unlink(configPath)
		]);
		await fs.rmdir(tempDir);
	}
	
	return output;
};

const mermaidLoader: loader.Loader = function (source) {
	const callback = this.async() as loader.loaderCallback;

	processDiagram(this, source.toString())
	.then((output) => {
		callback(null, `module.exports = ${JSON.stringify(output)};`)
	})
	.catch((err) =>  {
		callback(err);
	});
};

export default mermaidLoader;
