import fluxx from "@mohayonao/remote-fluxx";
import config from "../config";

const STORAGE_KEY = "@mohayonao/web-music-hackathon-04";

export default class StorageAction extends fluxx.Action {
  ["/storage/get"]() {
    let item = global.localStorage.getItem(STORAGE_KEY);
    let cache;

    if (!item) {
      cache = {
        song: config.DEFAULT_SONG,
        launchControlDeviceName: "",
        launchControlParams: config.DEFAULT_PARAMS,
        midiKeyboardDeviceName: "",
        midiKeyboardPresetName: "",
      };
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } else {
      cache = JSON.parse(item);
    }

    this.router.createAction("/sound/load/score", { name: cache.song });
    this.doneAction("/storage/get", cache);
  }

  ["/storage/set"](data) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
