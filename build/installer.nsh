!macro customInstall
  SetShellVarContext current
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\Character Todo.exe"
  Delete "$SMSTARTUP\Character Todo.lnk"
  CreateShortCut "$SMSTARTUP\Character Todo.lnk" "$INSTDIR\Character Todo.exe" "" "$INSTDIR\Character Todo.exe" 0
!macroend

!macro customUnInstall
  SetShellVarContext current
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\Character Todo.exe"
  Delete "$SMSTARTUP\Character Todo.lnk"
!macroend
