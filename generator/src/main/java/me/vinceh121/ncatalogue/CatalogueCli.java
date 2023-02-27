package me.vinceh121.ncatalogue;

import java.io.File;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.Callable;

import com.fasterxml.jackson.core.type.TypeReference;

import me.vinceh121.n2ae.script.NOBClazz;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Command
public class CatalogueCli implements Callable<Integer> {
	@Option(names = { "-m", "--model" }, required = true)
	private File model;

	@Option(names = { "-i", "--input" }, required = true)
	private Path origIn;

	@Option(names = { "-o", "--output" }, required = true)
	private Path assetsOut;

	@Override
	public Integer call() throws Exception {
		CatalogueGenerator gen = new CatalogueGenerator();
		gen.setOrigIn(origIn);
		gen.setAssetsOut(assetsOut);
		gen.setClassModel(CatalogueGenerator.MAPPER.readValue(this.model, new TypeReference<Map<String, NOBClazz>>() {
		}));

		gen.processAll();
		gen.getAssets().sort((a1, a2) -> a1.getName().compareTo(a2.getName()));
		CatalogueGenerator.MAPPER.writeValue(this.assetsOut.resolve("assets.json").toFile(), gen.getAssets());
		return 0;
	}

	public static void main(String[] args) {
		final int exit = new CommandLine(new CatalogueCli()).execute(args);
		System.exit(exit);
	}
}
