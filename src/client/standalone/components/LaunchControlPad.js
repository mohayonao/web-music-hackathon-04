import STYLES from "./styles";

export default class LaunchControlPad extends React.Component {
  constructor(...args) {
    super(...args);

    this.$onMouseDown = this.$onMouseDown.bind(this);
  }

  render() {
    let { data } = this.props;
    let styles = data.active ? STYLES.ACTIVE : STYLES.NORMAL;

    return (
      <div onMouseDown={ this.$onMouseDown } className="launch-control-pad" style={ styles }>
        { data.value }
      </div>
    );
  }

  $onMouseDown() {
    let { router, data } = this.props;

    router.createAction("/launch-control", {
      dataType: "pad",
      value: 127,
      track: data.track,
      channel: 0,
    });
  }
}
