# Ethereum Alerting System

This is a system for alerting on relevant transactions or events happening on the Ethereum network. The system tracks specified Ethereum addresses for specific events and sends email alerts to configured recipients when new transactions are detected. Additionally, it checks if provided addresses belong to validators on the Ethereum Beacon chain and includes relevant information in the alerts.

## Prerequisites

Before running the system, ensure you have the following installed:

- Docker: For running MailHog container (email testing tool for developers).

## Setup

1. **Clone the Repository**: Clone this repository to your local machine.

2. **Set up Environment Variables**: Create a `.env` file in the project root directory and populate it with the required environment variables:

   ```
   YOUR_WEB3_PROVIDER_URL=your_rpc_provider_url
   ADDRESSES=comma_separated_list_of_addresses_to_monitor (example: 0x3295049ca88E54d3cD7B3B2c87267f41D153e1C7)
   RECIPIENTS=comma_separated_list_of_receiver_emails
   FUNCTION_NAMES=comma_separated_list_of_function_to_monitor(example: transfer,deposit). If you want every transaction just type all
   ```

   Replace placeholders with appropriate values.

3. **Start the Container**: Run the following command in the project root directory to start the Mailhog container:

   ```
   docker-compose up -d
   ```

4. **Install dependencies**: Run the following command in the project root directory to install the dependencies:

   ```
   npm install
   ```

5. **Run the System**: Execute the Node script to start the alerting system:

   ```
   node index.js
   ```

## Additional Notes

- Ensure that the required ports (5432 for PostgreSQL and 25 for SMTP) are not being used by other applications on your system.

- Customize the `is_validator_address` function in the Python script to check if addresses belong to validators based on your requirements.

- Adjust the SMTP server configuration(Mailhog) and the function `sendEmail` according to your SMTP server requirements.

## Troubleshooting

- If you encounter any issues during setup or execution, refer to the error messages and logs for troubleshooting. Ensure that all required dependencies are properly installed and configured.

- Check the Docker container logs (`docker-compose logs`) for any error messages related to Mailhog.

- Verify that the environment variables are correctly set up and accessible to the Node script.
