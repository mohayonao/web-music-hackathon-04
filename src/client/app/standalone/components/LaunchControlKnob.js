import STYLES from "./styles";

export default class LaunchControlKnob extends React.Component {
  constructor(...args) {
    super(...args);

    this._onMouseDown = this._onMouseDown.bind(this);
  }

  render() {
    let { data } = this.props;
    let styles = data.active ? STYLES.ACTIVE : STYLES.NORMAL;

    return (
      <div onMouseDown={ this._onMouseDown } className="launch-control-knob" style={ styles }>
        { data.value }
      </div>
    );
  }

  _onMouseDown() {
    let { router, data } = this.props;

    router.createAction("/mouse/down", {
      target: this,
      action: "knobActive",
    });
    router.createAction("/launch-control/knob/active", {
      track: data.track, index: data.index,
    });
  }

  _onMouseMove({ dy }) {
    let { router, data } = this.props;

    router.createAction("/launch-control/knob/update", {
      track: data.track, index: data.index, delta: dy,
    });
  }

  _onMouseUp() {
    let { router, data } = this.props;

    router.createAction("/launch-control/knob/deactive", {
      track: data.track, index: data.index,
    });
  }
}
