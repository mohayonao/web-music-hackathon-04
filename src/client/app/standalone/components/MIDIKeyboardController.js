import MIDIKeyboardPad from "./MIDIKeyboardPad";

export default class MIDIKeyboardController extends React.Component {
  constructor(...args) {
    super(...args);

    this._onClick = this._onClick.bind(this);
  }

  render() {
    let { router } = this.props;

    return (
      <div className="midi-keyboard-controller">
        <MIDIKeyboardPad router={ router } data={{ noteOn: {}, value: "+" }} action={ this._onClick } />
        <MIDIKeyboardPad router={ router } data={{ noteOn: {}, value: "-" }} action={ this._onClick } />
      </div>
    );
  }

  _onClick(e) {
    let { router } = this.props;

    router.createAction("/midi-keyboard/octave-shift", {
      value: { "+": +1, "-": -1 }[e.target.innerText] || 0,
    });
  }
}
