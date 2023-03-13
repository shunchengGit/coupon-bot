import { WechatyBuilder, ScanStatus, log } from "wechaty";
import { FileBox } from "file-box";
import qrTerminal from "qrcode-terminal";

import {
  syncDatabase,
  databaseUserList,
  databaseUserFrequencyType,
  updateDatabaseUserProfile,
  databaseLastMarketingTime,
  updateDatabaseMarketingInfo,
} from "./database.js";

async function updateDatabaseAllUserProfile() {
  const regex = new RegExp("^99");
  const contactList = await bot.Contact.findAll({ alias: regex });
  console.log("contactList长度", contactList.length);

  for (const contact of contactList) {
    await updateDatabaseUserProfile(contact);
  }
}

async function sendPromotionalMessage(messageList) {
  const userList = await databaseUserList();
  for (const user of userList) {
    const alias = user?.dataValues?.alias;
    const contact = await bot.Contact.find({ alias });
    if (!contact) {
      return;
    }

    console.log("======sendPromotionalMessage", alias);

    const lastTime = await databaseLastMarketingTime(alias);
    const timestamp = new Date().getTime();
    const timeDiff = timestamp - lastTime;
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

    console.log("==是否能发送消息", canSendMessages);

    if (canSendMessages) {
      for (const message of messageList) {
        // await contact.say(message)
        await mockSendMessage(contact, message);
      }
      await updateDatabaseMarketingInfo(alias, timestamp);
    }
  }
}

async function mockSendMessage(contact, message) {
  console.log("mockSendMessage user", contact?.payload?.alias);
  console.log("mockSendMessage message", message);
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
  setTimeout(async () => {
    await syncDatabase();
    console.log("==============updateDatabaseAllUserProfile");
    await updateDatabaseAllUserProfile();
    console.log("==============sendPromotionalMessage");
    await sendPromotionalMessage("");
  }, 1000 * 30);
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

/**
 * 消息发送
 * @param msg
 * @param isSharding
 * @returns {Promise<void>}
 */
async function onMessage(msg) {
  // 默认消息回复
  // await defaultMessage(msg, bot)
  // 消息分片
  // await shardingMessage(msg,bot)
  // console.log(msg)
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

// async function find99Users() {
//   try {
//     const regex = new RegExp('^99', 'ig')
//     const theContact = await bot.Contact.findAll({ alias: regex })
//     // console.log(theContact)
//     let maleCount = 0
//     let femaleCount = 0
//     theContact.forEach((contact) => {
//       if (contact?.payload?.gender == '2') {
//         femaleCount = femaleCount + 1
//       } else if (contact?.payload?.gender == '1') {
//         maleCount = maleCount + 1
//       }
//       console.log(`${contact?.payload?.gender}, ${contact?.payload?.alias}`)
//     })
//     console.log(`${theContact.length} ${maleCount} ${femaleCount}`)
//   } catch (err) {
//     console.error(err)
//   }
// }

// async function main() {
//   // const contact = await bot.Contact.find({ name: '燕十三' })
//   const regex = new RegExp('^99')
//   const contactList = await bot.Contact.findAll({ alias: regex })
//   console.log('contactList长度', contactList.length)

//   for (const contact of contactList) {
//     await updateDatabaseUserProfile(contact)
//   }
// }

// async function action(contact) {
//   try {
//     if (!contact) {
//       console.log('not found')
//       return
//     }
//     console.log(`${contact?.payload?.gender}, ${contact?.payload?.alias}, ${contact?.payload?.name}`)
//     // const pictureMessage = FileBox.fromUrl('https://s1.ax1x.com/2023/03/08/ppmGQOA.jpg')
//     // await contact.say(pictureMessage)
//     // await contact.say('帮忙填一下九十九顶优惠券的问卷哈~ 填完后可以领取微信红包[抱拳]。如果之前填过请忽略~')
//   } catch (err) {
//     console.error(err)
//   }
// }

// async function logInfo(contact) {
//   try {
//     if (!contact) {
//       console.log('not found')
//       return
//     }
//     console.log(`${contact?.payload?.gender}, ${contact?.payload?.alias}, ${contact?.payload?.name}`)
//   } catch (err) {
//     console.error(err)
//   }
// }

console.log("启动微信机器人");
bot
  .start()
  .then(() => {
    console.log("Start to log in wechat...");
  })
  .catch((e) => console.error(e));
