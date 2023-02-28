import { useEffect, useState } from 'preact/hooks';
import Loader from './components/Loader';

function About() {
	const [protoCount, setProtoCount] = useState();

	useEffect(() => {
		if (!protoCount) {
			fetch("/assets/assets.json")
				.then(res => {
					if (res.ok) {
						res.json().then(assets => setProtoCount(assets.length));
					} else {
						console.error(res);
					}
				});
		}
	}, [protoCount, setProtoCount]);

	return <div style={{ padding: "0.5em" }}>
		<p>nebula2-catalogue is a project comprised of a Java CLI tool that generates a collection of glTF 2.0 files from a Nebula 2 prototype library,
			and a web front-end build using Vite, Preact and Three.js that displays the prototypes.</p>
		<p>This catalogue instance lists {protoCount || <Loader />} prototypes</p>
		<p><a href="https://github.com/vinceh121/nebula2-catalogue">Source code</a></p>
		<p>Copyright (C) 2023 Vincent Hyvert<br />
			<br />
			This program is free software: you can redistribute it and/or modify<br />
			it under the terms of the GNU Affero General Public License as published<br />
			by the Free Software Foundation, either version 3 of the License, or<br />
			(at your option) any later version.<br />
			<br />
			This program is distributed in the hope that it will be useful,<br />
			but WITHOUT ANY WARRANTY; without even the implied warranty of<br />
			MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the<br />
			GNU Affero General Public License for more details.<br />
			<br />
			You should have received a copy of the GNU Affero General Public License<br />
			along with this program.  If not, see <a href="https://www.gnu.org/licenses/">https://www.gnu.org/licenses/</a></p>
	</div>;
}

export default About;
