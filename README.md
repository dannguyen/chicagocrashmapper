# Chicago Death Mapper

## Project startup notes

This is a single page web-app that allows a user to enter the name of a Chicago location, e.g. an intersetion

    "N ABERDEEN ST & N OGDEN AVE"

The app will then look at the data in `static/locations.json` , and if there is a matching record, the app will display the geo coordinates of that location in text, and also as a marker on an interactive OpenStreetMap widget.
