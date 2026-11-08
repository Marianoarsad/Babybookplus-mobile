import React from "react";
import Svg, { Path } from "react-native-svg";

// Google's standard multicolor mark must not inherit app colors.
export default function GoogleMark() {
    return <Svg width={20} height={20} viewBox="0 0 18 18" accessible={false}>
        <Path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.909c1.702-1.567 2.683-3.875 2.683-6.615Z" />
        <Path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.957-2.18l-2.909-2.258c-.806.54-1.836.859-3.048.859-2.344 0-4.328-1.584-5.036-3.714H.957v2.332C2.438 15.968 5.482 18 9 18Z" />
        <Path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.282-1.707V4.961H.957A8.99 8.99 0 0 0 0 9c0 1.452.347 2.827.957 4.039l3.007-2.332Z" />
        <Path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.346l2.58-2.58C13.464.892 11.426 0 9 0 5.482 0 2.438 2.032.957 4.961l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58Z" />
    </Svg>;
}
