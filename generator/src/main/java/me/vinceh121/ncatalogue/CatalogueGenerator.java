package me.vinceh121.ncatalogue;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileVisitOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

import com.badlogic.gdx.math.Quaternion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import me.vinceh121.n2ae.gltf.GLTF;
import me.vinceh121.n2ae.gltf.GLTFGenerator;
import me.vinceh121.n2ae.gltf.Image;
import me.vinceh121.n2ae.gltf.Material;
import me.vinceh121.n2ae.gltf.Node;
import me.vinceh121.n2ae.gltf.PbrMetallicRoughness;
import me.vinceh121.n2ae.gltf.Primitive;
import me.vinceh121.n2ae.gltf.Texture;
import me.vinceh121.n2ae.gltf.TextureInfo;
import me.vinceh121.n2ae.model.NvxFileReader;
import me.vinceh121.n2ae.script.ICommandCall;
import me.vinceh121.n2ae.script.NOBClazz;
import me.vinceh121.n2ae.script.json.JsonScriptGenerator;
import me.vinceh121.n2ae.script.nob.NOBParser;

public class CatalogueGenerator {
	public static final ObjectMapper MAPPER = new ObjectMapper();
	private static final JsonScriptGenerator scriptGen = new JsonScriptGenerator(MAPPER);
	private final List<Asset> assets = new Vector<>();
	private final ExecutorService exec;
	private Map<String, NOBClazz> classModel;
	private Path origIn = Paths.get("./orig"), assetsOut = Paths.get("/tmp/assets");

	public CatalogueGenerator() {
		this(Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors()));
	}

	public CatalogueGenerator(ExecutorService exec) {
		this.exec = exec;
	}

	public void processAll() throws IOException {
		Iterator<Path> iter = Files.walk(origIn, FileVisitOption.FOLLOW_LINKS).iterator();
		while (iter.hasNext()) {
			Path p = iter.next();

			if (!"_main.tcl".equals(p.getFileName().toString())) {
				continue;
			}
			this.exec.submit(() -> {
				System.out.println(p);

				try {
					this.writeGltf(p.getParent());

					Asset a = new Asset();
					a.setName(p.getParent().getFileName().toString());
					this.assets.add(a);
				} catch (IOException e) {
					System.err.println("Failed to process " + p);
					e.printStackTrace();
				}
			});
		}

		ThreadPoolExecutor e = (ThreadPoolExecutor) this.exec;
		while (e.getActiveCount() > 0) {
			Thread.yield();
		}
	}

	public void writeGltf(final Path prototype) throws IOException {
		GLTF gltf = this.makeGltf(prototype, assetsOut.resolve(prototype.getFileName() + ".bin"));
		if (gltf != null) {
			MAPPER.writeValue(assetsOut.resolve(prototype.getFileName().toString() + ".gltf").toFile(), gltf);
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
			this.recurseVisuals(gen, "visual", visual);

			gen.buildBasicScene(name);
			gen.buildBuffer(bufferOut.getFileName().toString());
			gen.updateRootNodes();
			return gen.getGltf();
		}
	}

	private List<Integer> recurseVisuals(GLTFGenerator gen, String parentField, ObjectNode node) throws IOException {
		if (!node.isObject()) {
			return List.of();
		}

		List<Integer> newChildren = new ArrayList<>();
		List<Integer> children = new ArrayList<>();

		Iterator<String> fields = node.fieldNames();
		while (fields.hasNext()) {
			String field = fields.next();
			JsonNode cn = node.get(field);

			if (!cn.isObject()) {
				continue;
			}

			children.addAll(this.recurseVisuals(gen, field, (ObjectNode) cn));
		}

		if ("n3dnode".equals(node.get("@class").asText())) {
			JsonNode meshnode = getChildOfType(node, "nmeshnode");
			if (meshnode != null) {
				Path intPath = Paths.get(convertPath(meshnode.get("setfilename").asText()));
				Node gltfNode;
				try (InputStream mdlIn = Files.newInputStream(origIn.resolve(intPath))) {
					NvxFileReader mdl = new NvxFileReader(mdlIn);
					mdl.readAll();
					gltfNode = gen.addMesh(parentField + "." + intPath.getFileName(),
							mdl.getTypes(),
							mdl.getVertices(),
							mdl.getTriangles());
					gltfNode.setTranslation(this.getTranslation(node));
					gltfNode.setRotation(this.getRotation(node));
					gltfNode.getChildren().addAll(children);
					newChildren.add(gen.getGltf().getNodes().lastIndexOf(gltfNode));
				}

				JsonNode textureNode = getChildOfType(node, "ntexarraynode");
				if (textureNode != null) {
					ArrayNode setTex = (ArrayNode) textureNode.get("settexture"); // should be guaranteed to be an array
					if (setTex.get(0).isArray()) {
						// FIXME currently ignores multi-textures, might be too complicated than it is
						// worth
//						for (int i = 0; i < setTex.size(); i++) {
						int i = 0;
						assert i == setTex.get(i).get(0).asInt();
						this.makeTexture(i, gen, setTex.get(i).get(1).asText(), gltfNode);
//						}
					} else {
						assert 0 == setTex.get(0).asInt();
						this.makeTexture(0, gen, setTex.get(1).asText(), gltfNode);
					}
				}
			}
		} else if (children.size() > 0) {
			newChildren.add(this.makeEmptyNode(gen, parentField, children));
		}
		return newChildren;
	}

	private void makeTexture(int i, GLTFGenerator gen, String rawPath, Node targetNode) {
		Path imgPath = Paths.get(convertPath(rawPath));

		Image img = new Image();
		img.setUri(imgPath.toString().replace(".ntx", ".png"));
		gen.getGltf().getImages().add(img);

		Texture tex = new Texture();
		tex.setName(imgPath.getFileName().toString());
		tex.setSource(gen.getGltf().getImages().lastIndexOf(img));
		gen.getGltf().getTextures().add(tex);

		TextureInfo texInfo = new TextureInfo();
		texInfo.setIndex(gen.getGltf().getTextures().lastIndexOf(tex));
		texInfo.setTexCoord(i);

		PbrMetallicRoughness pbr = new PbrMetallicRoughness();
		pbr.setBaseColorTexture(texInfo);

		Material mat = new Material();
		mat.setName(imgPath.getFileName().toString());
		mat.setPbrMetallicRoughness(pbr);
		gen.getGltf().getMaterials().add(mat);

		Primitive pri = gen.getGltf().getMeshes().get(targetNode.getMesh()).getPrimitives().get(0);
		pri.setMaterial(gen.getGltf().getMaterials().lastIndexOf(mat));
	}

	private int makeEmptyNode(GLTFGenerator gen, String nodeName, List<Integer> children) {
		Node n = new Node();
		n.setName(nodeName);
		n.getChildren().addAll(children);
		gen.getGltf().getNodes().add(n);
		return gen.getGltf().getNodes().lastIndexOf(n);
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
		return new float[] { (float) t.get(0).asDouble(), (float) t.get(1).asDouble(), (float) t.get(2).asDouble() };
	}

	private float[] getRotation(JsonNode n) {
		JsonNode r = n.get("rxyz");
		if (r == null) {
			return new float[] { 0, 0, 0, 1 };
		}
		Quaternion q = new Quaternion()
			.setEulerAngles((float) r.get(0).asDouble(), (float) r.get(1).asDouble(), (float) r.get(2).asDouble());
		return new float[] { q.x, q.y, q.z, q.w };
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

	public List<Asset> getAssets() {
		return assets;
	}
}
