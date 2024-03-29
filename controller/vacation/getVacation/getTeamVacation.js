const { Op } = require('sequelize');

module.exports = async (req, res, userJSON) => {
  const { db } = res;
  const { email, from, to } = req.body;

  const curUser = await db.users.findOne({
    where: {
      email: userJSON.email,
    },
    include: db.groups,
  });

  let whereClause = '';
  let targetUserJSON = null;
  const curUserJSON = curUser.toJSON();
  if (curUserJSON.auth !== 'admin') {
    const targetUser = await db.users.findOne({
      where: {
        email,
      },
      include: db.groups,
    });

    if (!email) return res.endWithMessage(400, 'TARGET EMAIL IS NOT SPECIFIED');

    if (!targetUser) return res.endWithMessage(400, 'NO SUCH USER');
    targetUserJSON = targetUser.toJSON();
    whereClause = `WHERE U.groupId = ${targetUserJSON.groupId}`;
  }

  const query = `
    SELECT
      V.id,
      V.from,
      V.to,
      V.status,
      V.approver,
      V.reason,
      V.createdAt,
      U.auth,
      U.email,
      U.mobile,
      U.name as userName
    FROM
      vacations as V
    INNER JOIN
      users as U on V.userId=U.id
    ${whereClause}
  `;

  const vacations = await new Promise((resolve, reject) => {
    db.mysql.query(query, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });

  const vacationData = vacations
    .filter((ele) => {
      const validFrom = Date.parse(ele.from) - Date.parse(from) > 0;
      const validTo = Date.parse(to) - Date.parse(ele.to) > 0;
      return validFrom && validTo;
    });

  return res.json({
    groupName: curUserJSON.auth === 'admin' ? 'all' : curUserJSON.group.name,
    vacations: vacationData,
  });
};
