import path from "path";
import webpack from "webpack";
import memoryfs from "memory-fs";
import expect from "expect.js";

function compiler(fixture: string) {
	const compiler = webpack({
		context: __dirname,
		entry: `./${fixture}`,
		output: {
			path: path.resolve(__dirname),
			filename: "bundle.js"
		},
		module: {
			rules: [{
				test: /\.mmd$/,
				use: {
					loader: path.resolve(__dirname, "../src/loader.ts"),
					options: {

					}
				}
			}]
		}
	});

	compiler.outputFileSystem = new memoryfs();

	return new Promise<webpack.Stats>((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) reject(err);
			if (stats.hasErrors()) reject(new Error(stats.toJson().errors.join("\n")));

			resolve(stats);
		})
	});
}

describe("loader", function () {
	it("should compile the example", async function () {
		const stats = await compiler("example.mmd");
		const modules = stats.toJson().modules as webpack.Stats.FnModules[];

		expect(modules.length).to.equal(1);

		const output = modules[0].source;
	});
});
