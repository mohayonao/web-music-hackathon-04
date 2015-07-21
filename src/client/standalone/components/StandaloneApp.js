import ToggleButton from "./ToggleButton";
import LaunchControl from "./LaunchControl";
import MIDIKeyboard from "./MIDIKeyboard";

export default class StandaloneApp extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = this.getStateFromStores();

    this.$onChange = this.$onChange.bind(this);
  }

  getStateFromStores() {
    let { router } = this.props;

    return router.getStateFromStores();
  }

  componentWillMount() {
    let { router } = this.props;

    router.addChangeListener(this.$onChange);
  }

  componentWillUnmount() {
    let { router } = this.props;

    router.removeChangeListener(this.$onChange);
  }

  render() {
    let { router } = this.props;
    let soundButtonData = {
      value: this.state.sound.soundState === "running",
      trueValue: "SOUND ON",
      falseValue: "SOUND OFF",
    };
    let sequencerButtonData = {
      value: this.state.sound.sequencerState === "running",
      trueValue: "SEQUENCER ON",
      falseValue: "SEQUENCER OFF",
    };

    return (
      <div>
        <div>
          <ToggleButton router={ router } data={ soundButtonData } action="sound" />
          <ToggleButton router={ router } data={ sequencerButtonData } action="sequencer" />
        </div>
        <hr />
        <div className="form">
          <div className="form-group">
            <label>MIDI Controller</label>
            <LaunchControl router={ router } data={ this.state.launchControl } />
          </div>
          <div className="form-group">
            <label>MIDI Keyboard</label>
            <MIDIKeyboard router={ router } data={ this.state.midiKeyboard } />
          </div>
        </div>
      </div>
    );
  }

  $onChange() {
    this.setState(this.getStateFromStores());
  }
}
