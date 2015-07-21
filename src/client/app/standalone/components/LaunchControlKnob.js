import STYLES from "./styles";
import MouseHandler from "./MouseHandler";

export default class LaunchControlKnob extends React.Component {
  constructor(...args) {
    super(...args);

    this.$onMouseDown = this.$onMouseDown.bind(this);
  }

  render() {
    let { data } = this.props;
    let styles;

    if (data.active) {
      styles = STYLES.ACTIVE;
    } else if (data.enabled) {
      styles = STYLES.ENABLED;
    } else {
      styles = STYLES.NORMAL;
    }

    return (
      <div onMouseDown={ this.$onMouseDown } className="launch-control-knob" style={ styles }>
        { data.value }
      </div>
    );
  }

  $onMouseDown() {
    let { router, data } = this.props;

    MouseHandler.set(this);

    router.createAction("/launch-control/knob/active", {
      track: data.track, index: data.index,
    });
  }

  $onMouseMove({ dy }) {
    let { router, data } = this.props;

    router.createAction("/launch-control/knob/update", {
      track: data.track, index: data.index, delta: dy,
    });
  }

  $onMouseUp() {
    let { router, data } = this.props;

    router.createAction("/launch-control/knob/deactive", {
      track: data.track, index: data.index,
    });
  }
}
