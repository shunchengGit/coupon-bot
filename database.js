import { Sequelize, DataTypes, where } from "sequelize";

const sequelize = new Sequelize("wechat_bot", "root", null, {
  host: "127.0.0.1",
  dialect: "mysql",
});

const userProfileModel = sequelize.define("UserProfileFor99", {
  alias: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  gender: DataTypes.TINYINT,
  frequencyType: DataTypes.TINYINT,
  reason: DataTypes.STRING,
  ageType: DataTypes.TINYINT,
  jobType: DataTypes.TINYINT,
});

async function databaseUserList() {
  const userList = await userProfileModel.findAll();
  return userList;
}

const marketingInfoModel = sequelize.define("MarketingInfoFor99", {
  alias: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true,
  },
  lastMarketingTime: DataTypes.BIGINT,
});

async function syncDatabase() {
  await sequelize.sync({ alter: true }).then(() => {
    console.log("Database synced");
  });
}

async function databaseUserFrequencyType(alias) {
  try {
    if (!alias) {
      console.log("no alias");
      return;
    }
    console.log(`databaseUserFrequencyType`, alias);

    const userProfile = await userProfileModel.findOne({
      where: { alias },
    });

    if (userProfile?.dataValues?.frequencyType === 0) {
      return 0;
    } else {
      return userProfile?.dataValues?.frequencyType || 1;
    }
  } catch (err) {
    console.error(err);
  }
}

async function updateDatabaseUserProfile(contact) {
  try {
    if (!contact) {
      console.log("not found");
      return;
    }
    console.log(`updateDatabaseUserProfile`, contact?.playload?.alias);

    await userProfileModel
      .upsert({
        alias: contact?.payload?.alias,
        name: contact?.payload?.name,
        gender: contact?.payload?.gender,
      })
      .then((result) => {
        // console.log(result)
      });
  } catch (err) {
    console.error(err);
  }
}

async function databaseLastMarketingTime(alias) {
  try {
    if (!alias) {
      console.log("no alias");
      return;
    }
    console.log(`databaseMarketingInfo`, alias);

    const marketingInfo = await marketingInfoModel.findOne({
      where: {
        alias,
      },
    });

    if (!marketingInfo) {
      return 0;
    }
    return marketingInfo?.dataValues?.lastMarketingTime;
  } catch (err) {
    console.error(err);
  }
}

async function updateDatabaseMarketingInfo(alias, time) {
  try {
    if (!alias || !time) {
      console.log("no alias or no time");
      return;
    }
    console.log(`updateDatabaseMarketingInfo`, alias, time);

    await marketingInfoModel
      .upsert({
        alias,
        lastMarketingTime: time,
      })
      .then((result) => {
        // console.log(result)
      });
  } catch (err) {
    console.error(err);
  }
}

export {
  syncDatabase,
  databaseUserList,
  databaseUserFrequencyType,
  updateDatabaseUserProfile,
  databaseLastMarketingTime,
  updateDatabaseMarketingInfo,
};
