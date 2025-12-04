/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("presentations", {
    is_active: {
      type: "boolean",
      notNull: true,
      default: false,
    },
  });
};

exports.down = false;
