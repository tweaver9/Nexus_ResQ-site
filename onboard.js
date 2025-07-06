
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Onboard Client</title>
  <link rel="stylesheet" href="CSS/onboard.css" />
  <style>
    .customDivisionBlock {
      margin-left: 16px;
      margin-bottom: 8px;
    }
    .add-btn {
      background-color: #fdd835;
      border: none;
      color: #000;
      padding: 4px 10px;
      cursor: pointer;
      border-radius: 4px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="form-wrapper">
    <h1>Client Onboarding</h1>
    <form id="addClientForm">
      <label>Client Name: <input type="text" id="clientName" required></label><br>
      <label>Logo Upload: <input type="file" id="clientLogo" accept="image/*" required></label><br>
      <label>Primary Color: <input type="text" id="primaryColor" placeholder="#fdd835" required></label><br>
      <label>Secondary Color: <input type="text" id="secondaryColor" placeholder="#142b47" required></label><br>
      <label>Subdomain: <input type="text" id="subdomain" placeholder="e.g. citgo" required></label><br>

      <hr>

      <label>Admin First Name: <input type="text" id="adminFirstName" required></label><br>
      <label>Admin Last Name: <input type="text" id="adminLastName" required></label><br>
      <label>Admin Username: <input type="text" id="adminUsername" required></label><br>
      <label>Admin Password: <input type="password" id="adminPassword" required></label><br>

      <hr>

      <label><input type="checkbox" id="precisionEnabled" /> Enable Precision Scanning?</label><br>

      <div id="precisionOptions" style="display: none; margin-left: 16px">
        <label>Precision Scan Threshold: <input type="number" id="precisionThreshold" value="0.5" step="0.01" min="0" max="1"></label><br>
        <label>Precision Scan Timeout (ms): <input type="number" id="precisionTimeout" value="5000" min="1000"></label><br>
        <label><input type="checkbox" id="namingSystem" /> Client Has Existing Naming System?</label><br>
        <label><input type="checkbox" id="autoGenerateBarcodes" /> Auto-Generate Barcode Locations?</label><br>
      </div>

      <hr>

      <label>How is your map divided? <input type="text" id="divisionLabel" placeholder="Zone / Area / custom" required></label><br>
      <div id="divisionCountSection">
        <label>How many divisions? <input type="number" id="divisionCount" min="1" /></label><br>
      </div>
      <div id="customNamesContainer" style="display: none;"></div>

      <hr>

      <button type="submit">Create Client</button>
    </form>
  </div>

  <script type="module" src="onboard.js"></script>
  <script>
    const precisionToggle = document.getElementById('precisionEnabled');
    const precisionOptions = document.getElementById('precisionOptions');
    const divisionLabelInput = document.getElementById('divisionLabel');
    const divisionCountInput = document.getElementById('divisionCount');
    const customNamesContainer = document.getElementById('customNamesContainer');

    precisionToggle.addEventListener('change', () => {
      precisionOptions.style.display = precisionToggle.checked ? 'block' : 'none';
    });

    divisionLabelInput.addEventListener('input', () => {
      const label = divisionLabelInput.value.trim().toLowerCase();
      customNamesContainer.innerHTML = '';
      customNamesContainer.style.display = label === 'custom' ? 'block' : 'none';

      if (label === 'custom') {
        addCustomDivisionField(); // start with one
      }
    });

    function addCustomDivisionField() {
      const block = document.createElement('div');
      block.className = 'customDivisionBlock';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'customDivisionInput';
      input.placeholder = 'Enter division name...';
      input.style.width = '80%';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-btn';
      addBtn.textContent = '+';
      addBtn.onclick = addCustomDivisionField;

      block.appendChild(input);
      block.appendChild(document.createElement('br'));
      block.appendChild(addBtn);

      customNamesContainer.appendChild(block);
    }
  </script>
</body>
</html>
