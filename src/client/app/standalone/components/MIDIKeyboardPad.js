import STYLES from "./styles";

export default class MIDIKeyboardPad extends React.Component {
  constructor(...args) {
    super(...args);

    this._onMouseDown = this._onMouseDown.bind(this);
  }

  render() {
    let { data } = this.props;
    let styles = data.noteOn[data.value] ? STYLES.ACTIVE : STYLES.NORMAL;

    return (
      <div onMouseDown={ this._onMouseDown } className="midi-keyboard-pad" style={ styles }>
        { data.value }
      </div>
    );
  }

  _onMouseDown(e) {
    let { router, data } = this.props;

    if (typeof this.props.action === "function") {
      this.props.action(e);
    } else {
      router.createAction("/mouse/down", {
        target: this,
        action: this.props.action,
      });
      router.createAction("/midi-keyboard/noteOn", {
        dataType: "noteOn",
        noteNumber: data.value,
        velocity: 100,
      });
    }
  }

  _onMouseUp() {
    let { router, data } = this.props;

    router.createAction("/midi-keyboard/noteOff", {
      dataType: "noteOff",
      noteNumber: data.value,
      velocity: 0,
    });
  }
}
