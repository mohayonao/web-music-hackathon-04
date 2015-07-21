import STYLES from "./styles";
import MouseHandler from "./MouseHandler";

export default class MIDIKeyboardPad extends React.Component {
  constructor(...args) {
    super(...args);

    this.$onMouseDown = this.$onMouseDown.bind(this);
  }

  render() {
    let { data } = this.props;
    let styles = data.noteOn[data.value] ? STYLES.ACTIVE : STYLES.NORMAL;

    return (
      <div onMouseDown={ this.$onMouseDown } className="midi-keyboard-pad" style={ styles }>
        { data.value }
      </div>
    );
  }

  $onMouseDown(e) {
    let { router, data } = this.props;

    if (typeof this.props.action === "function") {
      this.props.action(e);
    } else {
      MouseHandler.set(this);
      router.createAction("/midi-keyboard/noteOn", {
        dataType: "noteOn",
        noteNumber: data.value,
        velocity: 100,
      });
    }
  }

  $onMouseUp() {
    let { router, data } = this.props;

    router.createAction("/midi-keyboard/noteOff", {
      dataType: "noteOff",
      noteNumber: data.value,
      velocity: 0,
    });
  }
}
