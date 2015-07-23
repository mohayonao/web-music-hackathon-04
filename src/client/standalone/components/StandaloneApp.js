import ToggleButton from "../../components/ToggleButton";
import SongSelector from "../../components/SongSelector";
import LaunchControl from "../../components/LaunchControl";
import MIDIKeyboard from "../../components/MIDIKeyboard";
import STYLES from "../../components/styles";

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
    let styles = this.state.sequencer.enabled ? STYLES.SEQUENCER_ON : STYLES.SEQUENCER_OFF;
    let soundButtonData = {
      value: this.state.sound.enabled,
      trueValue: "SOUND ON",
      falseValue: "SOUND OFF",
    };
    let sequencerButtonData = {
      value: this.state.sequencer.enabled,
      trueValue: "SEQUENCER ON",
      falseValue: "SEQUENCER OFF",
    };

    return (
      <div>
        <h1 style={ styles }>WEB MUSIC HACKATHON 04</h1>
        <div>
          <ToggleButton router={ router } data={ soundButtonData } action="sound" />
          <ToggleButton router={ router } data={ sequencerButtonData } action="sequencer" />
        </div>
        <hr />
        <div className="form">
          <div className="form-group">
            <label>SONG</label>
            <SongSelector router={ router } data={ this.state.sequencer } />
          </div>
          <div className="form-group">
            <label>MIDI Controller / LAUNCH CONRTOL</label>
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
