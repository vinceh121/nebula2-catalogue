import "./Card.css";
import { Link } from "wouter";

function Card(props) {
	const { title, children } = props;

	const body = <>{children}
		{title ? <h3>{title}</h3> : undefined}</>;

	if (props.href) {
		return <Link href={props.href}>
			<a className="card" {...props}>
				{body}
			</a>
		</Link>
	} else {
		return <div className="card" {...props}>
			{body}
		</div>
	}
}

export default Card;
