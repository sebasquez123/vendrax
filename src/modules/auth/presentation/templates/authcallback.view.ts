export const renderSuccessView = (): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Complete</title>

  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
    }

    .card {
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, .1);
    }

    .icon {
      font-size: 42px;
      color: #28a745;
      margin-bottom: 15px;
    }

    h2 {
      margin: 0 0 10px;
    }

    p {
      margin: 0;
      color: #666;
    }
  </style>
</head>

<body>
  <div class="card">
    <div class="icon">✓</div>

    <h2>Authentication successful</h2>

    <p>You are now authenticated.</p>
    <p>You can close this tab.</p>
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.close();
      }, 1500);
    };
  </script>
</body>
</html>
`;
};
