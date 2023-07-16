import { WechatyBuilder, ScanStatus, log } from "wechaty";
import { FileBox } from "file-box";
import qrTerminal from "qrcode-terminal";
import {
  syncDatabase,
  databaseUserList,
  databaseUserFrequencyType,
  updateDatabaseUserProfile,
  databaseLastMarketingTime,
  updateDatabaseMarketingTime,
} from "./database.js";

const config = {
  // env: "test",
  env: "prod",
};

async function updateDatabaseAllUserProfile() {
  const regex = new RegExp("^99");
  const contactList = await bot.Contact.findAll({ alias: regex });
  console.log("contactList长度", contactList.length);

  for (const contact of contactList) {
    await updateDatabaseUserProfile(contact);
  }
}

async function sendPromotionalMessage(data) {
  const userList = await databaseUserList();
  for (const user of userList) {
    try {
      await new Promise((resolve, reject) => {
        setTimeout(async () => {
          const alias = user?.dataValues?.alias;
          const contact = await bot.Contact.find({ alias });
          if (!contact) {
            reject();
            return;
          }

          console.log("======sendPromotionalMessage", alias);

          var canSendMessages = await checkIfCanSendMessage(
            alias,
            data?.timeInterval
          );

          console.log("==是否能发送消息", canSendMessages);

          if (!canSendMessages) {
            reject();
            return;
          }

          const { messageList } = data;
          for (const message of messageList) {
            await sendMessage(contact, message);
          }
          await updateDatabaseMarketingTime(alias, new Date().getTime());
          resolve();
        }, 3000);
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function checkIfCanSendMessage(alias, timeInterval) {
    if (config.env == "test") {
      return true;
    }
    const lastTime = await databaseLastMarketingTime(alias);
    const timestamp = new Date().getTime();
    const timeDiff = timestamp - lastTime;
    // 有传入的间隔
    if (timeInterval && timeDiff > timeInterval) {
      return true;
    }

    const frequencyType = await databaseUserFrequencyType(alias);
    const oneMonthMilSec = 30 * 24 * 60 * 60 * 1000;
    console.log("==时间信息", frequencyType, timeDiff, timestamp, lastTime);
    const conditions = [
      {
        frequencyType: 0,
        timeDiff: 1 * oneMonthMilSec,
      },
      {
        frequencyType: 1,
        timeDiff: 3 * oneMonthMilSec,
      },
      {
        frequencyType: 2,
        timeDiff: 6 * oneMonthMilSec,
      },
      {
        frequencyType: 3,
        timeDiff: 12 * oneMonthMilSec,
      },
    ];
    let canSendMessages = false;
    for (const condition of conditions) {
      if (
        frequencyType === condition.frequencyType &&
        timeDiff > condition.timeDiff
      ) {
        canSendMessages = true;
        break;
      }
    }
    return canSendMessages;
  }
}

async function mockSendMessage(contact, message) {
  console.log("mockSendMessage user", contact?.payload?.alias);
  console.log("mockSendMessage message", message);
}

async function sendMessage(contact, message) {
  if (config.env == "test") {
    await mockSendMessage(contact, message);
    return;
  }

  const { type, content } = message;
  if (type === "pic") {
    const fileBox = FileBox.fromUrl(content);
    await contact.say(fileBox);
  } else if (type === "text") {
    await contact.say(content);
  }
}

async function exeCmd(msg) {
  if (msg?.age() > 60) {
    return;
  }

  const text = msg?.text();
  const cmdObject = JSON.parse(text);
  const { cmd, data } = cmdObject;

  if (cmd === "更新用户信息") {
    msg.say(`开始执行 ${cmd}`);
    await updateDatabaseAllUserProfile();
    msg.say(`结束执行 ${cmd}`);
  } else if (cmd === "开始推送") {
    msg.say(`开始执行 ${cmd}`);
    await sendPromotionalMessage(data);
    msg.say(`结束执行 ${cmd}`);
  }
}

// 扫码
function onScan(qrcode, status) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    // 在控制台显示二维码
    qrTerminal.generate(qrcode, { small: true });
    const qrcodeImageUrl = [
      "https://api.qrserver.com/v1/create-qr-code/?data=",
      encodeURIComponent(qrcode),
    ].join("");
    console.log("onScan:", qrcodeImageUrl, ScanStatus[status], status);
  } else {
    log.info("onScan: %s(%s)", ScanStatus[status], status);
  }
}

// 登录
function onLogin(user) {
  console.log(`${user} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
  console.log(`Automatic robot chat mode has been activated`);
  syncDatabase();
}

// 登出
function onLogout(user) {
  console.log(`${user} has logged out`);
}

// 收到好友请求
async function onFriendShip(friendship) {
  const frienddShipRe = /chatgpt|chat/;
  if (friendship.type() === 2) {
    if (frienddShipRe.test(friendship.hello())) {
      await friendship.accept();
    }
  }
}

async function onMessage(msg) {
  if (msg?.talker()?.name() === "燕十三") {
    console.log("onMessage", msg?.text(), msg?.age());
    try {
      await exeCmd(msg);
    } catch (e) {
      console.error("exeCmd", e);
    }
  }
}

// 初始化机器人
const CHROME_BIN = process.env.CHROME_BIN
  ? { endpoint: process.env.CHROME_BIN }
  : {};
export const bot = WechatyBuilder.build({
  name: "WechatEveryDay",
  // puppet: 'wechaty-puppet-wechat4u', // 如果有token，记得更换对应的puppet
  puppet: "wechaty-puppet-wechat", // 如果 wechaty-puppet-wechat 存在问题，也可以尝试使用上面的 wechaty-puppet-wechat4u ，记得安装 wechaty-puppet-wechat4u
  puppetOptions: {
    uos: true,
    ...CHROME_BIN,
  },
});

// 扫码
bot.on("scan", onScan);
// 登录
bot.on("login", onLogin);
// 登出
bot.on("logout", onLogout);
// 收到消息
bot.on("message", onMessage);
// 添加好友
bot.on("friendship", onFriendShip);

console.log("启动微信机器人");

bot
  .start()
  .then(() => {
    // bot.logout();
    console.log("Start to log in wechat...");
  })
  .catch((e) => console.error(e));
