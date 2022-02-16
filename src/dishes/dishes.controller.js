const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass

function hasRequiredProps(req, res, next) {
  const { data } = req.body;
  const requiredProps = ["name", "description", "price", "image_url"];
  const props = Object.keys(data);
  const hasProps = requiredProps.every((prop) => {
    return props.includes(prop);
  });
  if (hasProps) {
    next();
  } else {
    const missingProps = requiredProps.filter((prop) => !props.includes(prop));
    next({
      status: 400,
      message: `You are missing the ${missingProps} property`,
    });
  }
}

function hasRequiredContent(req, res, next) {
  const { data } = req.body;
  const contents = Object.values(data);
  const hasContent = contents.every((content) => content);
  let hasPrice = "true";
  if (data.price) {
    hasPrice = data.price > 0 && typeof data.price === "number";
  }
  if (hasContent && hasPrice) {
    next();
  } else {
    const emptyProp = [];
    if (typeof data.price === "string") {
      next({
        status: 400,
        message: `The price proptery is string. It needs to be a number`,
      });
    }
    for (const prop in data) {
      if (!data[prop] || data[prop] <= 0) {
        emptyProp.push(prop);
      }
    }
    next({ status: 400, message: `${emptyProp[0]} is empty` });
  }
}

function hasDishId(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id == dishId);
  if (foundDish) {
    res.locals.foundDish = foundDish;
    next();
  } else {
    next({ status: 404, message: "${dishId} not found" });
  }
}

function checkReqId(req, res, next) {
  const { data } = req.body;
  const id = data.id;
  const { dishId } = req.params;
  if (!id || id === dishId) {
    delete data.id;
    next();
  } else {
    next({
      status: 400,
      message: `Request id: ${id} does not match dish id. Please match it or remove it`,
    });
  }
}

function create(req, res, next) {
  const { data } = req.body;
  const newDish = {
    id: nextId(),
    ...data,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function list(req, res, next) {
  res.json({ data: dishes });
}

function read(req, res, next) {
  const { foundDish } = res.locals;
  res.json({ data: foundDish });
}

function update(req, res, next) {
  let { foundDish } = res.locals;
  const { data } = req.body;
  foundDish = {
    id: foundDish.id,
    ...data,
  };
  res.json({ data: foundDish });
}

module.exports = {
  list,
  read: [hasDishId, read],
  create: [hasRequiredProps, hasRequiredContent, create],
  update: [hasDishId, checkReqId, hasRequiredContent, hasRequiredProps, update],
};
