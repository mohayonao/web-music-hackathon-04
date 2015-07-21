import LaunchControlKnob from "./LaunchControlKnob";
import LaunchControlPad from "./LaunchControlPad";

export default class LaunchControlTrackContainer extends React.Component {
  render() {
    let { router, data } = this.props;
    let trackElements = [ 0, 1, 2, 3, 4, 5, 6, 7 ].map((track) => {
      let knob1data = { track, index: 0, value: data.params[track], enabled: data.enabledParams[track], active: data.activeKnob === track };
      let knob2data = { track, index: 1, value: data.params[track + 8], enabled: data.enabledParams[track + 8], active: data.activeKnob === track + 8 };
      let pad1data = { track, index: 0, active: data.activePad[track] };

      return (
        <li className="launch-control-track">
          <LaunchControlKnob router={ router } data={ knob1data } />
          <LaunchControlKnob router={ router } data={ knob2data } />
          <LaunchControlPad router={ router } data={ pad1data } />
        </li>
      );
    });

    return (
      <ul className="launch-control-track-container">{ trackElements }</ul>
    );
  }
}
