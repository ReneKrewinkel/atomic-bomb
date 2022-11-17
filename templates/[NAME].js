import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

/// TODO: Define props
const [NAME] = (props) => {

    return(
        <div data-testid={ props.testID }
             data-object-type={ props.type ?? ""}
             className={ `[NAME] ${props.size} more utility classes` }>
        </div>
    )

}

/// TODO: add more utility classes if needed!

/// TODO: Adjust and extend!
const sizes = [
    "small",
    "medium",
    "large"
]

/// TODO: Adjust and extend
const exceptionClasses = [
    "button",
    "regular"
]

[NAME].propTypes = {
    testID: PropTypes.string,
    type: PropTypes.oneOf(exceptionClasses),
    size: PropTypes.oneOf(sizes),
}

export default [NAME]