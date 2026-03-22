const localBaseUrl = "http://127.0.0.1:3000";
const lanBaseUrl = "";

// 真机调试时把 useLanBaseUrl 改为 true，并填写本机局域网地址。
const useLanBaseUrl = false;

const apiBaseUrl = useLanBaseUrl && lanBaseUrl ? lanBaseUrl : localBaseUrl;

module.exports = {
  appConfig: {
    apiBaseUrl,
    apiMode: useLanBaseUrl && lanBaseUrl ? "局域网真机调试" : "本机开发者工具调试"
  }
};
