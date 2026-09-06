!macro customInit
  nsExec::Exec 'taskkill /F /IM "Character Todo Google.exe" /T'
  Sleep 1000
!macroend

!macro customUnInit
  nsExec::Exec 'taskkill /F /IM "Character Todo Google.exe" /T'
  Sleep 1000
!macroend

!macro customUnInstallCheck
  ; 구버전 언인스톨러의 사소한 종료 코드(2 등)로 인해 새 버전 설치가 중단되는 현상을 방지
  DetailPrint "Bypassing uninstall error check to allow clean overwrite."
!macroend

!macro customUnInstallCheckCurrentUser
  DetailPrint "Bypassing uninstall error check for current user."
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

