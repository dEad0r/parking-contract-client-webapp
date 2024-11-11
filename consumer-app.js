import { config } from './config.js'; // Import the configuration

let provider; // Ensure provider is defined in the global scope
let signer;

const contractAddress = config.contractAddress; // Use contract address from config
const contractABI = [
  "function park(uint256 locationId, string licensePlate, uint16 timeInMinutes) public payable",
  "function getCostToPark(uint256 timeInMinutes, uint256 locationId) public view returns (uint256)"
]; // Add more ABI details if needed

// Set initial text when the page loads
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("calculatedAmount").innerText = "Enter location and time to see the price.";
  document.getElementById("buyButton").disabled = true; // Ensure button is disabled initially
});

// Event listener for connecting to MetaMask
document.getElementById("connectButton").addEventListener("click", async () => {
  console.log("Connect Wallet button clicked");
  if (typeof window.ethereum !== "undefined") {
    try {
      console.log("Requesting account access...");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      const account = await signer.getAddress();
      console.log("Connected to account:", account);
      document.getElementById("connectButton").innerText = "Connected";
      document.getElementById("formContainer").style.display = "block";
    } catch (error) {
      console.error("User denied account access or an error occurred:", error);
      document.getElementById("status").innerText = "Failed to connect to MetaMask.";
    }
  } else {
    console.error("MetaMask is not detected.");
    document.getElementById("status").innerText = "MetaMask is not installed.";
  }
});

// Add event listeners to trigger the updateAmount function when inputs change
document.getElementById("locationId").addEventListener("input", updateAmount);
document.getElementById("timeInMinutes").addEventListener("input", updateAmount);

// Function to update the amount displayed based on user input
async function updateAmount() {
  const locationId = document.getElementById("locationId").value;
  const timeInMinutes = document.getElementById("timeInMinutes").value;

  if (!locationId || !timeInMinutes) {
    // Display a message when inputs are not yet filled
    document.getElementById("calculatedAmount").innerText = "Enter location and time to see the price.";
    document.getElementById("buyButton").disabled = true;
    return;
  }

  if (locationId && timeInMinutes && provider && signer) {
    try {
      console.log("Fetching cost for locationId:", locationId, "timeInMinutes:", timeInMinutes);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Log before calling the contract method
      console.log("Calling getCostToPark with", timeInMinutes, locationId);
      
      const cost = await contract.getCostToPark(timeInMinutes, locationId);

      // Log the cost received from the contract
      console.log("Cost received:", cost.toString());
      
      document.getElementById("calculatedAmount").innerText = cost.toString() + " WEI";
      document.getElementById("buyButton").disabled = false;
    } catch (error) {
      console.error("Failed to fetch parking cost:", error);
      document.getElementById("calculatedAmount").innerText = "Error calculating cost";
      document.getElementById("buyButton").disabled = true;
    }
  } else {
    console.log("Waiting for valid input or provider not initialized");
    document.getElementById("calculatedAmount").innerText = "Enter location and time to see the price.";
    document.getElementById("buyButton").disabled = true;
  }
}

// Event listener for form submission to buy a parking ticket
document.getElementById("parkingForm").addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent form from reloading the page
  console.log("Buy Ticket button clicked");

  const locationId = document.getElementById("locationId").value;
  const licensePlate = document.getElementById("licensePlate").value;
  const timeInMinutes = document.getElementById("timeInMinutes").value;
  const amountInWei = document.getElementById("calculatedAmount").innerText.split(" ")[0];

  try {
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // Send the transaction to buy the parking ticket
    console.log("Sending transaction...");
    const tx = await contract.park(
      locationId,
      licensePlate,
      timeInMinutes,
      { value: ethers.BigNumber.from(amountInWei) }
    );

    document.getElementById("status").innerText = "Transaction sent: " + tx.hash;
    console.log("Transaction sent:", tx.hash);

    // Wait for the transaction to be confirmed
    await tx.wait();
    document.getElementById("status").innerText = "Transaction confirmed: " + tx.hash;
    console.log("Transaction confirmed:", tx.hash);
  } catch (error) {
    console.error("Transaction failed:", error);
    document.getElementById("status").innerText = "Transaction failed.";
  }
});
