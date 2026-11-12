/** 内置示例：电商 API（OpenAPI 3.0） */
export const SAMPLE_SPEC = `{
  "openapi": "3.0.3",
  "info": { "title": "电商平台 API", "version": "1.2.0", "description": "商品、订单、支付相关接口" },
  "servers": [{ "url": "https://api.example.com/v1" }],
  "paths": {
    "/users": {
      "get": {
        "summary": "获取用户列表",
        "tags": ["用户"],
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" }, "description": "页码" },
          { "name": "size", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "成功", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/User" } } } } },
          "400": { "description": "参数错误" }
        }
      },
      "post": {
        "summary": "创建用户",
        "tags": ["用户"],
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateUserRequest" } } } },
        "responses": {
          "201": { "description": "创建成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/User" } } } },
          "400": { "description": "邮箱已存在" }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "获取用户详情",
        "tags": ["用户"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": {
          "200": { "description": "成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/User" } } } },
          "404": { "description": "用户不存在" }
        }
      }
    },
    "/products": {
      "get": {
        "summary": "商品列表",
        "tags": ["商品"],
        "parameters": [
          { "name": "keyword", "in": "query", "schema": { "type": "string" } },
          { "name": "categoryId", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "成功", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Product" } } } } }
        }
      },
      "post": {
        "summary": "创建商品",
        "tags": ["商品"],
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateProductRequest" } } } },
        "responses": {
          "201": { "description": "创建成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Product" } } } }
        }
      }
    },
    "/products/{id}": {
      "get": {
        "summary": "商品详情",
        "tags": ["商品"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": {
          "200": { "description": "成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Product" } } } },
          "404": { "description": "商品不存在" }
        }
      },
      "delete": {
        "summary": "下架商品",
        "tags": ["商品"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": { "204": { "description": "已下架" }, "403": { "description": "无权限" } }
      }
    },
    "/orders": {
      "get": {
        "summary": "我的订单列表",
        "tags": ["订单"],
        "parameters": [
          { "name": "status", "in": "query", "schema": { "type": "string", "enum": ["pending", "paid", "shipped", "closed"] } },
          { "name": "page", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "成功", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Order" } } } } },
          "401": { "description": "未登录" }
        }
      },
      "post": {
        "summary": "创建订单",
        "tags": ["订单"],
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateOrderRequest" } } } },
        "responses": {
          "201": { "description": "下单成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Order" } } } },
          "400": { "description": "库存不足" },
          "409": { "description": "重复下单" }
        }
      }
    },
    "/orders/{id}": {
      "get": {
        "summary": "订单详情",
        "tags": ["订单"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": {
          "200": { "description": "成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Order" } } } },
          "404": { "description": "订单不存在" }
        }
      },
      "patch": {
        "summary": "修改订单状态",
        "tags": ["订单"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
        "requestBody": { "content": { "application/json": { "schema": { "type": "object", "properties": { "status": { "type": "string", "enum": ["paid", "shipped", "closed"] } }, "required": ["status"] } } } },
        "responses": { "200": { "description": "更新成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Order" } } } } }
      }
    },
    "/payments": {
      "post": {
        "summary": "发起支付",
        "tags": ["支付"],
        "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreatePaymentRequest" } } } },
        "responses": {
          "201": { "description": "支付单创建成功", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Payment" } } } },
          "402": { "description": "余额不足" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "required": ["id", "email", "nickname"],
        "properties": {
          "id": { "type": "string", "format": "uuid", "description": "用户 ID" },
          "email": { "type": "string", "format": "email", "description": "登录邮箱" },
          "nickname": { "type": "string", "description": "昵称" },
          "avatarUrl": { "type": "string", "format": "uri" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      },
      "CreateUserRequest": {
        "type": "object",
        "required": ["email", "password", "nickname"],
        "properties": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "format": "password", "minLength": 8 },
          "nickname": { "type": "string", "maxLength": 20 }
        }
      },
      "Product": {
        "type": "object",
        "required": ["id", "name", "price"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "name": { "type": "string", "description": "商品名" },
          "price": { "type": "number", "description": "售价（元）" },
          "stock": { "type": "integer", "description": "库存" },
          "categoryId": { "type": "string", "description": "所属分类" },
          "coverUrl": { "type": "string", "format": "uri" }
        }
      },
      "CreateProductRequest": {
        "type": "object",
        "required": ["name", "price", "stock"],
        "properties": {
          "name": { "type": "string" },
          "price": { "type": "number" },
          "stock": { "type": "integer" },
          "categoryId": { "type": "string" }
        }
      },
      "Order": {
        "type": "object",
        "required": ["id", "userId", "items", "totalAmount", "status"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "userId": { "type": "string", "description": "下单用户" },
          "items": { "type": "array", "items": { "$ref": "#/components/schemas/OrderItem" }, "description": "订单商品" },
          "totalAmount": { "type": "number", "description": "订单总额" },
          "status": { "type": "string", "enum": ["pending", "paid", "shipped", "closed"], "description": "订单状态" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      },
      "OrderItem": {
        "type": "object",
        "required": ["productId", "quantity", "price"],
        "properties": {
          "productId": { "type": "string", "description": "商品 ID" },
          "quantity": { "type": "integer" },
          "price": { "type": "number", "description": "下单时单价" }
        }
      },
      "CreateOrderRequest": {
        "type": "object",
        "required": ["items", "addressId"],
        "properties": {
          "items": { "type": "array", "items": { "type": "object", "properties": { "productId": { "type": "string" }, "quantity": { "type": "integer" } } } },
          "addressId": { "type": "string", "description": "收货地址" },
          "couponCode": { "type": "string" }
        }
      },
      "Payment": {
        "type": "object",
        "required": ["id", "orderId", "amount", "status"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "orderId": { "type": "string", "description": "关联订单" },
          "amount": { "type": "number" },
          "channel": { "type": "string", "enum": ["wechat", "alipay", "card"] },
          "status": { "type": "string", "enum": ["created", "success", "failed", "refunded"] },
          "paidAt": { "type": "string", "format": "date-time" }
        }
      },
      "CreatePaymentRequest": {
        "type": "object",
        "required": ["orderId", "channel"],
        "properties": {
          "orderId": { "type": "string" },
          "channel": { "type": "string", "enum": ["wechat", "alipay", "card"] }
        }
      }
    }
  }
}`
