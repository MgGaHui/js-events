export default class Events {
  _eventList = {} // 监听器列表
  _offlineOrgList = {} // 离线参数列表
  _conf = {
    offline: false // 是否支持离线模式，即先发布后订阅功能
  }

  constructor (config = {offline: false}) {
    this._eventList = {}
    this._offlineOrgList = {}
    Object.assign(this._conf, config)
  }

  /** 是否离线模式
   * @return {Boolean} - 返回布尔值是否支持离线功能
   * */
  get isOfflineMode () {
    return this._conf.offline
  }

  // 获取监听器列表
  getListenersByName (name) {
    const eventList = this._eventList
    return eventList[name] || (eventList[name] = [])
  }

  // 获取某一类型监听器数量
  getListenersCount (name) {
    return this.getListenersByName(name).length
  }

  // 获取离线参数列表
  getOfflineOrgList (name) {
    return this._offlineOrgList[name] || (this._offlineOrgList[name] = [])
  }

  /** 清除监听器列表
   *@param name - 事件类型名
   * */
  cleaListenersByName (name) {
    this._eventList[name] = []
  }

  // 清除离线参数
  clearOfflineOrg (name) {
    this._offlineOrgList[name] = []
  }

  /** 合并选项参数
   *@param options - 合并生成每一个监听选项
   * @return {Object}
   * */
  mergerOptions (options) {
    const option = typeof options === 'object' ? options || {} : {}
    return {
      count: typeof option.count === 'number' ? option.count : -1,
      repeat: !!option.repeat,
      listener: null
    }
  }

  /** 注册监听事件
   * @param name             - 监听器类型名称
   * @param fn               - 监听器函数
   * @param options
   * @param options.count    - 监听器可执行次数,默认-1，表示不限次数,若为0则会跳过注册,程序中会判断执行次数为0时移除监听器
   * @param options.repeat   - 同一个监听器fn是否可以添加多次,默认否
   * */
  on (name, fn, options) {
    if (typeof name !== 'undefined' && typeof fn === 'function') {
      this.registerListener(name, fn, options)
      this.execOfflineListeners(name)
    }
  }

  // 注册监听器
  registerListener (name, fn, options = {count: -1, repeat: false}) {
    const listenerWrapper = this.mergerOptions(options)
    const listeners = this.getListenersByName(name)
    // 是否能够注册监听事件
    let canAdd = listenerWrapper.count !== 0 && // 不能为0
      !listenerWrapper.repeat && // 不允许重复情况
      listeners.every((item) => { // 不存在相同的监听器
        return item.listener !== fn
      })
    if (canAdd) {
      listenerWrapper.listener = fn
      listeners.push(listenerWrapper)
    }
  }

  // 注册只执行一次的监听器
  once (name, fn) {
    this.on(name, fn, {count: 1})
  }

  // 触发监听事件
  emit (name, ...args) {
    const listeners = this.getListenersByName(name)
    const length = listeners.length
    // 如果触发前没有注册监听事件，即先触发事件情况时
    if (length === 0 && this.isOfflineMode) {
      // 缓存请求参数
      const offlineOrgList = this.getOfflineOrgList(name)
      offlineOrgList.push(args)
    } else {
      this.execListeners(name, ...args)
    }
  }

  // 执行监听器
  execListeners (name, ...args) {
    const listeners = this.getListenersByName(name)
    const length = listeners.length
    for (let index = 0; index < length; index++) {
      const listenItem = listeners[index]
      if (!listenItem) { // 当前项删除的时候不存在
        continue
      }
      listenItem.listener(...args)
      if (listenItem.count < 0) {
        continue
      }
      if (--listenItem.count === 0) {
        listeners.splice(index--, 1)
      }
    }
  }

  // 执行离线监听事件
  execOfflineListeners (name) {
    const offlineOrgList = this.getOfflineOrgList(name)
    // 消耗离线消息数量
    let consumeCount
    // 循环判断直至没有离线消息或者没有对应监听器才结束循环
    while (consumeCount = Math.min(offlineOrgList.length, this.getListenersCount(name))) {
      // 删除已经被消费的消息并执行监听器
      offlineOrgList.splice(0, consumeCount).forEach((args) => {
        this.execListeners(name, ...args)
      })
    }
  }

  // 移除监听事件
  off (name, fn) {
    if (typeof name === 'undefined') {
      return
    }
    this.isOfflineMode && this.clearOfflineOrg(name)
    if (!fn) {
      this.cleaListenersByName(name)
      return
    }
    const listeners = this.getListenersByName(name)
    let length = listeners.length
    while (length--) {
      if (listeners[length].listener === fn) {
        listeners.splice(length, 1)
      }
    }
  }
}
