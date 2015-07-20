import STYLES from "./styles";

export default class ToggleButton extends React.Component {
  constructor(...args) {
    super(...args);

    this._onClick = this._onClick.bind(this);
  }

  render() {
    let { data } = this.props;
    let caption = data.value ? data.trueValue : data.falseValue;
    let styles = data.value ? STYLES.ON : STYLES.OFF;

    return (
      <button onClick={ this._onClick } className="btn btn-default btn-toggle" style={ styles }>
        { caption }
      </button>
    );
  }

  _onClick(e) {
    let { router, data } = this.props;

    if (typeof this.props.action === "function") {
      this.props.action(e);
    } else {
      router.createAction(`/click/${this.props.action}`, {
        value: data.value,
      });
    }
  }
}
