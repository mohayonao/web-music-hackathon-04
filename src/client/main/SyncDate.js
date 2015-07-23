let deltaTime = 0;

export default class SyncDate {
  constructor() {
    return new Date(Date.now() + deltaTime);
  }

  static setDeltaTime(value) {
    deltaTime = value;
  }

  static now() {
    return Date.now() + deltaTime;
  }
}
