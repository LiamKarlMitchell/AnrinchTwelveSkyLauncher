There should be a shortcut to run the nw exe and have the working directory the level up.
This might be able to be made into a tiny stand alone exe later?.....


This repos contents apart from this readme file should be put into the game folder.



# Patches

The launcher will load a `version.dat` in the game folder.
If there is none or there is a problem reading it then the current client version will be considered 0.
The server is asked on the `patchURL` for the servers `version.txt` which contains an integer for the server's patch version.

If the client is behind the server version it will attempt to patch.

Each version number is mapped to a directory on the patch server.
1/
2/
3/ etc...

Inside this directory should be a `info.txt` file which has instructions for patching seperated by new lines.
The file does not need to end with a new line.

Currently we only have the following Instructions.
All instruction commands should be written in lower case.
If you want to have spaces in a filename parameter please URL encode it eg the ' ' space character would become %20.

All download file paths are relative to the patchURL + /  + versionToPatch /

## zip
Instructs the launcher to download and extract a zip file.

There are 2 arguments.
Filename and Location.

Usage: zip filename.zip .
Usage: zip filename.zip
Currently the only locations accepted are nothing or . which should map to the games working directory.

**Note:** In the future it would be possible to download but not extract the zip file.
And ask it first for files before downloading getting them from the patch server.

Currently the progress bars don't update like I would like. This is a known issue.

## alert
Instructs the launcher to show an alert message.

Usage: alert message goes in here
Usage: alert Hello World!

It was made as more of a test command than anything to use for real.

## reload
Instructs the launcher to finish patching the version it is on and reload the launcher application.
It should give the user 3 secconds warning at least. By changing the status label.
It is incase we have to change launcher code with a patch :).

If the patch was a success patching will continue with the next patch.













Later on we will have these.

## diff
## zdiff
## exec

And maybe something like

## tos
## agree agreement.md
