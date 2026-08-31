# CarLog

An iOS/Android compatible mobile app to help vehicle owners track their maintenance history and service records easily.

## Purpose

This app was born out of the desire to have my vehicle's complete service history available to me at a glance, especially when preparing to sell a vehicle.

There are often a copious amount of reciepts and notes scattered in the glovebox from the last service trip, and random reminders and windshield stickers tracking my last oil change.

CarLog exists to solve that problem: your one-stop centralized digital garage for logging, tracking, and storing vehicle service history.

## Architecture

CarLog is a cross-platfrom mobile application targeted at **iOS/Android** from one codebase. It is built on **Vue** using **Capacitor** to allow easy development and targeting of both platforms. UI is leveraging **Ionic** for cross-platform components and **Pinia** for state management. Local storage is handled with **Capacity Community SQLite** on device, with the goal of adding cloud backups down the line.

## Development plan

See the [implementation plan](docs/implementation-plan.md) for the planned architecture, data model, phases, and acceptance criteria.

## Features

### In Development

- Core data types
- Adding new vehicles

### Planned Features

- [ ] Ability to manage multiple vehicles
- [ ] Oil change history and reminders
- [ ] PDF Export of entire vehicle history
- [ ] Cloud data backup and sync
- [ ] Suggested maintenance schedule based on mileage
- [ ] Receipt photo attachments for service record document tracking
