# Vefforritun 2 - Verkefni 2
## Almenn lýsing og wireflows af Vefappi

Daniel, Kiara, Hörður

=======
## Flamed?
### Lýsing
#### Vefapp þar sem hægt er að finna veitingastað í hóp.

Maður býr til leik, býður vinum sínum og hver og einn "swipar" gegnum veitingastaði, hægri fyrir já, vinstri fyrir nei. Appið finnur svo veitingastað sem allir eru sammála að fara.
Ef að enginn er sammála, eða margir veitingastaðir fundnir, þá er hægt að snúa lukkuhjóli til að ákveða.

#### Upplýsingar/Hugmyndir
- Margar mismunandi leikjatýpur
  - *Lukkuhjól*: Hópurinn velur sínar óskir um mat og staðsetningu og fer svo strax í að snúa lukkujhólið
  - *Mót*: Hópurinn velur sínar óskir um mat og staðsetningu og fer svo í útsláttarmót, þar sem veitingastaðir eru birtir fyrir alla og það er kosið um hvaða staðir komast áfram.
  - *"Live Mode"*: Allir spila saman á sama tíma og niðurstöður birtar samstundis. Hraðara og skemmtilegra
  - *"Asynchronous mode"*: Fólk spilar þegar þeim hentar, niðurstöður svo birtar gegnum Notification.

- Hérna eru nokrar hugmyndir um stillingar/óskir sem hægt væri að velja
  - *Aksturstími*: Hversu langt það tekur að keyra/labba að staðnum, notar Google Maps API.
  - *Krakkavænt*: Til Dæmis: Hvort að staðurinn sé með leiksvæði eða barnamatseðil
  - *Verð*: Notar Google Maps og Tripadvisor upplýsingar til þess að finna út verðið sirka, $ - $$$$ (í rauninni 2.000 - 10.000kr)
 
- Eftir að hafa valið veitingastað og leikurinn er búinn þá spyr appið hvort að þú viljir geyma upplýsingarnar og búa til reikning.
- Hægt að merkja veitingastað sem favorite, sem geymist og eykur tækifæri á að hann sé valinn (Golden buzzer style animation þegar það er ýtt á takkann)
- Hægt að hafa marga notendur á einum síma, þannig ef að manneskja hefur ekki síma eða vill ekki að nota hann, þá getur hann samt verið með að velja staðþ
- Eftir að hafa klárað fyrsta leikinn sinn spyr appið þig hvort að þú viljir búa til account til þess að geta vista stillingar og óskir þínar. Það væri einnig hægt að vista hópinn þannig að þurfi ekki að bjóða öllum aftur
- Bæta við Sundlaugum og öðrum skemmtistöðum (td. söfn eða Smárabíó skemmtisvæðið). Það væri hægt að velja í byrjun hvort að maður vilji finna veitingastaði og/eða skemmtistað, þetta getur notað nákvæmlega sama formattið.
  
=======

## WireFrame
![wireframe](./20250829_115336.jpg)

#### English
Instead of pulling teeth. Press buttons!
Tired of having to wrangle answers out of people about where to go, only to be shot down by the very same people that told **you** to choose.
With our app, **you** can exploit **their** need for dopamine by feeding them a list of restaurant tailored your preferences, simply invite your friends to your pre-made group and have them swipe until you have a clear winner, but what if everyone picks something different?
**Remove choice and leave it to chance!**
If there is no winner after swiping, spin the wheel! populated by everyones choices.
Picking a random location will remove any dissenting voices.
- No hassle.
- Quickly put a group together.
- Pick your prefrences.
- Swipe away at an automatically generated list, based on your prefrences.
- Invite your friends to swipe on the list and add more prefrences(if needed).
- Initiate tie breakers.

### User Stories

#### Young People
- **WHO**: Group of friends cant decide on an activity in advance,
- **WHAT**: They open the "Tinder Restaurant app (Flamed)" and add activities they might be interested in.
- **WHY**: They want to avoid the burden of having sole responsibility for picking a location.

#### Big Families
- **WHO**: A family cant decide where to eat after a wake.
- **WHAT**: They get on the app and add a couple of their favorite locations.
- **WHY**: They use the roulette feature to vote on a winner as they are to burdened by grief to decide on their own.

#### Middle Aged People
- **WHO**: A group of old friends that just wants to eat somewhere together.
- **WHAT**: One persone gets on the web-app and creates a game, the others then join when its convenient for them and swipe, they later get a notification that a place has been chosen by the app.
- **WHY**: They want to avoid the hassle of choosing a restaurant everyone agrees they want to go to.

## User Scenario

### Dale Grible - Pest Control
Dale just hired a group of interns for the summer. After a decade of hard work business is picking up, even without a college degree, Dale has found a way to sustain himself, much to his parents chagrin. At the start of the summer Dale decided he would expand his buisness to be able to take on a more clienttell and scaleback his involvment to set himself up for retirement, to enable himself to do that, he decided to hire a bach of interns for the summer. If everything goes well, he plans to hire them fulltime. Dale wants a light hearted way to break the ice, organize a little shindig and grab some food with his new team members.
