const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function checkIfPending(req, res, next) {
  const {
    foundOrder: { status },
  } = res.locals;
  if (status === "pending") {
    next();
  } else {
    next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
}

function checkStatus(req, res, next) {
  const {
    data: { status },
  } = req.body;
  const validStatus = ["delivered", "out-for-delivery", "preparing", "pending"];
  const hasValidStatus = validStatus.includes(status);
  if (status && hasValidStatus) {
    next();
  } else {
    next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }
}

function matchId(req, res, next) {
  const { orderId } = req.params;
  const { data } = req.body;
  if (orderId == data.id || !data.id) {
    const { id, ...content } = data;
    res.locals.content = content;
    next();
  } else {
    next({
      status: 400,
      message: `id: ${data.id} of body does not match ${orderId} from the route`,
    });
  }
}

function hasRequiredContent(req, res, next) {
  const { data } = req.body;
  delete data.id;
  const contents = Object.values(data);
  const hasContent = contents.every((content) => content);
  let errMessage = "";
  if (hasContent) {
    let errIndex = [];
    const hasQuantity = data.dishes.every((dish, index) => {
      if (dish.quantity > 0 && typeof dish.quantity === "number") {
        return true;
      }
      errIndex.push(index);
      return false;
    });
    const hasDish = data.dishes.length > 0;
    if (hasQuantity && hasDish) {
      next();
    } else {
      if (!hasQuantity)
        errMessage = `Dish ${errIndex} must have a quantity that is an integer greater than 0`;
      if (!hasDish) errMessage = "Order must include one dish";
    }
  }
  const emptyProp = [];
  for (const prop in data) {
    if (!data[prop] || data[prop] <= 0) {
      emptyProp.push(prop);
    }
  }
  if (emptyProp.length > 0) errMessage = `${emptyProp[0]} is empty`;

  next({ status: 400, message: errMessage });
}

function hasOrderId(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id == orderId);
  if (foundOrder) {
    res.locals.foundOrder = foundOrder;
    next();
  } else {
    next({ status: 404, message: `Could not find order: ${orderId}` });
  }
}

function hasRequiredProps(req, res, next) {
  const { data } = req.body;
  const requiredProps = ["deliverTo", "mobileNumber", "dishes"];
  const props = Object.keys(data);
  const hasProps = requiredProps.every((prop) => {
    return props.includes(prop);
  });
  const dishIndex = [];
  let errMessage = "";
  const isArray = Array.isArray(data.dishes);
  if (hasProps && isArray) {
    const dishesHaveQuantity = data.dishes.every((dish, index) => {
      const props = Object.keys(dish);
      if (!props.includes("quantity")) {
        dishIndex.push(index);
        return false;
      }
      return true;
    });

    if (dishesHaveQuantity) {
      res.locals.data = data;
      next();
    } else {
      errMessage = `Dish ${dishIndex} must have a quantity that is an integer greater than 0`;
    }
  }
  const missingProps = requiredProps.filter((prop) => !props.includes(prop));
  if (missingProps.length > 0)
    errMessage = `You are missing the ${missingProps} property`;
  if (!isArray) errMessage = `dish needs to be an array`;
  next({ status: 400, message: errMessage });
}

function list(req, res, next) {
  res.json({ data: orders });
}

function read(req, res, next) {
  const { foundOrder } = res.locals;
  res.json({ data: foundOrder });
}

function create(req, res, next) {
  const { data } = res.locals;
  const newOrder = {
    id: nextId(),
    ...data,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res, next) {
  let { content, foundOrder } = res.locals;
  foundOrder = { id: foundOrder.id, ...content };
  res.json({ data: foundOrder });
}

function destroy(req, res, next) {
  const { foundOrder } = res.locals;
  const index = orders.findIndex((order) => order.id == foundOrder.id);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [hasOrderId, read],
  create: [hasRequiredProps, hasRequiredContent, create],
  update: [
    checkStatus,
    hasOrderId,
    matchId,
    hasRequiredProps,
    hasRequiredContent,
    update,
  ],
  delete: [hasOrderId, checkIfPending, destroy],
};
