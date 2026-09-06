!macro customInit
  nsExec::Exec 'taskkill /F /IM "Character Todo Google.exe" /T'
  Sleep 1000
!macroend

!macro customUnInit
  nsExec::Exec 'taskkill /F /IM "Character Todo Google.exe" /T'
  Sleep 1000
!macroend

!macro customInstall
  SetShellVarContext current
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\Character Todo Google.exe"
  Delete "$SMSTARTUP\Character Todo Google.lnk"
  CreateShortCut "$SMSTARTUP\Character Todo Google.lnk" "$INSTDIR\Character Todo Google.exe" "" "$INSTDIR\Character Todo Google.exe" 0
!macroend

!macro customUnInstall
  SetShellVarContext current
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\Character Todo Google.exe"
  Delete "$SMSTARTUP\Character Todo Google.lnk"
!macroend
