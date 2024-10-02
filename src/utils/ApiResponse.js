class ApiResponse {
  constructor(statusCode, data, message = "success", success) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.succes = statusCode < 400;
  }
}

export { ApiResponse };
