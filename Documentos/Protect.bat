@echo off
Del C:\PROSISTEMAS\SCA\scaEnvio.exe
Del C:\PROSISTEMAS\SCA\scaVersao.exe
Del C:\PROSISTEMAS\SCA\scaAtualizador.exe

SET NEWLINE=^& echo.
SET NEWLINE=^& echo.
FIND /C /I "177.70.22.235" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	177.70.22.235>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
FIND /C /I "sistemasca.com" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	sistemasca.com>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
FIND /C /I "wwjpm2tzfd.undercloud.net" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	wwjpm2tzfd.undercloud.net>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
FIND /C /I "52.165.21.19" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	52.165.21.19>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
FIND /C /I "www.sistemasca.com" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.sistemasca.com>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
FIND /C /I "www.prosistemas.com" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.prosistemas.com>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
FIND /C /I "prosistemas.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	prosistemas.com>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "www.terminalsca.com" %WINDIR%\system32\drivers\etc\hosts
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.terminalsca.com>>%WINDIR%\system32\drivers\etc\hosts

SET NEWLINE=^& echo.
SET NEWLINE=^& echo.
FIND /C /I "177.70.22.235" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	177.70.22.235>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
FIND /C /I "sistemasca.com" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	sistemasca.com>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
FIND /C /I "wwjpm2tzfd.undercloud.net" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	wwjpm2tzfd.undercloud.net>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
FIND /C /I "52.165.21.19" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	52.165.21.19>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
FIND /C /I "www.sistemasca.com" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.sistemasca.com>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
FIND /C /I "www.prosistemas.com" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.prosistemas.com>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
FIND /C /I "prosistemas.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	prosistemas.com>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "www.terminalsca.com" %WINDIR%\system32\drivers\etc\host
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.terminalsca.com>>%WINDIR%\system32\drivers\etc\host

SET NEWLINE=^& echo.
SET NEWLINE=^& echo.
FIND /C /I "177.70.22.235" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	177.70.22.235>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "sistemasca.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	sistemasca.com>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "wwjpm2tzfd.undercloud.net" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	wwjpm2tzfd.undercloud.net>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "52.165.21.19" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	52.165.21.19>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "www.sistemasca.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.sistemasca.com>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "www.prosistemas.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.prosistemas.com>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "prosistemas.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	prosistemas.com>>%WINDIR%\system32\drivers\etc\hosts.ics

SET NEWLINE=^& echo.
FIND /C /I "www.terminalsca.com" %WINDIR%\system32\drivers\etc\hosts.ics
IF %ERRORLEVEL% NEQ 0 ECHO %NEWLINE%^127.0.0.1	www.terminalsca.com>>%WINDIR%\system32\drivers\etc\hosts.ics
:END