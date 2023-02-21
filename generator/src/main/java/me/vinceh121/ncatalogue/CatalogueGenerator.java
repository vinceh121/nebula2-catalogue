package me.vinceh121.ncatalogue;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileVisitOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import me.vinceh121.n2ae.gltf.GLTF;
import me.vinceh121.n2ae.gltf.GLTFGenerator;
import me.vinceh121.n2ae.gltf.Node;
import me.vinceh121.n2ae.model.NvxFileReader;
import me.vinceh121.n2ae.script.ICommandCall;
import me.vinceh121.n2ae.script.NOBClazz;
import me.vinceh121.n2ae.script.json.JsonScriptGenerator;
import me.vinceh121.n2ae.script.nob.NOBParser;

public class CatalogueGenerator {
	private static final ObjectMapper MAPPER = new ObjectMapper();
	private static final JsonScriptGenerator scriptGen = new JsonScriptGenerator(MAPPER);
	private final List<Asset> assets = new Vector<>();
	private Map<String, NOBClazz> classModel;
	private Path origIn = Paths.get("./orig"), assetsOut = Paths.get("./assets");

	public static void main(String[] args) throws IOException {
		CatalogueGenerator gen = new CatalogueGenerator();

		gen.setClassModel(MAPPER.readValue(new File("../../nebula2-assets-extractor/project-nomads.classmodel.json"),
				new TypeReference<Map<String, NOBClazz>>() {
				}));

		gen.processAll();
	}

	public void processAll() throws IOException {
		Iterator<Path> iter = Files.walk(origIn, FileVisitOption.FOLLOW_LINKS).iterator();
		while (iter.hasNext()) {
			Path p = iter.next();

			if (!"_main.tcl".equals(p.getFileName().toString())) {
				continue;
			}
			System.out.println(p);

			try {
				this.writeGltf(p.getParent());

				Asset a = new Asset();
				a.setName(p.getParent().toString());
				this.assets.add(a);
			} catch (IOException e) {
				System.err.println("Failed to process " + p);
				e.printStackTrace();
			}
		}
	}

	public void writeGltf(final Path prototype) throws IOException {
		GLTF gltf = this.makeGltf(prototype, assetsOut.resolve(prototype.getFileName() + ".bin"));
		if (gltf != null) {
			MAPPER.writerWithDefaultPrettyPrinter()
				.writeValue(assetsOut.resolve(prototype.getFileName().toString() + ".gltf").toFile(), gltf);
		} else {
			System.out.println("\tNo visuals: " + prototype);
		}
	}

	public GLTF makeGltf(final Path prototype, Path bufferOut) throws IOException {
		List<ICommandCall> script;
		try (InputStream scriptIn = Files.newInputStream(prototype.resolve("_main.n"))) {
			NOBParser parser = new NOBParser();
			parser.setClassModel(this.classModel);
			parser.read(scriptIn);
			script = parser.getCalls();
		}

		return this.makeGltf(prototype.getFileName().toString(), script, bufferOut);
	}

	public GLTF makeGltf(final String name, List<ICommandCall> script, Path bufferOut) throws IOException {
		ObjectNode node = scriptGen.generateJson(script);
		ObjectNode visual = (ObjectNode) node.get("visual");
		if (visual == null) {
			return null;
		}

		try (FileOutputStream out = new FileOutputStream(bufferOut.toFile())) {
			GLTFGenerator gen = new GLTFGenerator(out);
			this.recurseVisuals(gen, visual);

			gen.buildBasicScene(name);
			gen.buildBuffer(bufferOut.getFileName().toString());
			return gen.getGltf();
		}
	}

	private void recurseVisuals(GLTFGenerator gen, ObjectNode node) throws IOException {
		if (!"n3dnode".equals(node.get("@class").asText())) {
			return;
		}

		Iterator<String> fields = node.fieldNames();
		while (fields.hasNext()) {
			String field = fields.next();
			JsonNode cn = node.get(field);

			if (!cn.isObject()) {
				continue;
			}

			JsonNode meshnode = getChildOfType(cn, "nmeshnode");
			if (meshnode != null) {
				try (InputStream mdlIn =
						Files.newInputStream(origIn.resolve(convertPath(meshnode.get("setfilename").asText())))) {
					NvxFileReader mdl = new NvxFileReader(mdlIn);
					mdl.readAll();
					Node gltfNode = gen.addMesh(field, mdl.getTypes(), mdl.getVertices(), mdl.getTriangles());
					gltfNode.setTranslation(this.getTranslation(node));
					gltfNode.setRotation(this.getRotation(node));
				}
			}

		}
	}

	private String convertPath(String path) {
		if (path.startsWith("data:")) {
			return path.replace("data:", "").toLowerCase();
		} else if (path.startsWith("lib:")) {
			return path.replace("lib:", "lib/").toLowerCase();
		}
		return path.toLowerCase();
	}

	private float[] getTranslation(JsonNode n) {
		JsonNode t = n.get("txyz");
		if (t == null) {
			return new float[3];
		}
		return new float[] { (float) t.get(0).asDouble(), (float) t.get(3).asDouble(), (float) t.get(2).asDouble() };
	}

	private float[] getRotation(JsonNode n) {
		JsonNode r = n.get("rxyz");
		if (r == null) {
			return new float[] { 0, 0, 0, 1 };
		}
		return new float[] { (float) r.get(0).asDouble(), (float) r.get(3).asDouble(), (float) r.get(2).asDouble(),
				(float) r.get(3).asDouble() };
	}

	private JsonNode getChildOfType(JsonNode n, String type) {
		Iterator<String> fields = n.fieldNames();
		while (fields.hasNext()) {
			String field = fields.next();
			JsonNode cn = n.get(field);
			if (cn.isObject() && type.equals(cn.get("@class").asText())) {
				return cn;
			}
		}
		return null;
	}

	public NvxFileReader readModel(Path sub) throws IOException {
		try (InputStream in = Files.newInputStream(origIn.resolve(sub))) {
			NvxFileReader read = new NvxFileReader(in);
			read.readAll();
			return read;
		}
	}

	public Map<String, NOBClazz> getClassModel() {
		return classModel;
	}

	public void setClassModel(Map<String, NOBClazz> classModel) {
		this.classModel = classModel;
	}

	public Path getOrigIn() {
		return origIn;
	}

	public void setOrigIn(Path origIn) {
		this.origIn = origIn;
	}

	public Path getAssetsOut() {
		return assetsOut;
	}

	public void setAssetsOut(Path assetsOut) {
		this.assetsOut = assetsOut;
	}
}
