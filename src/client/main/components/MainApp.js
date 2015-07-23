import ToggleButton from "../../components/ToggleButton";
import STYLES from "../../components/styles";

export default class MainApp extends React.Component {
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

    return (
      <div>
        <h1 style={ styles }>WEB MUSIC HACKATHON 04</h1>
        <div>
          <ToggleButton router={ router } data={ soundButtonData } action="sound" />
          <div>connected: { this.state.server.connected }</div>
        </div>
      </div>
    );
  }

  $onChange() {
    this.setState(this.getStateFromStores());
  }
}
